import { slugify } from "@/lib/data/util";
import type { SetType } from "@/lib/schemas/common";
import type { Session, WorkoutSet } from "@/lib/schemas/session";
import { setsForSlot } from "@/lib/workout/session";
import { hashId, num, parseCsv, parseDate, parseDurationSec, toCsv, type RowError } from "./csv";

/** Canonical workout CSV columns (export order) and accepted header aliases (import). */
export const WORKOUT_COLUMNS = [
  "date",
  "started_at",
  "session_id",
  "workout",
  "duration_min",
  "session_notes",
  "exercise",
  "exercise_id",
  "set_number",
  "set_type",
  "weight_kg",
  "reps",
  "rpe",
  "rest_sec",
  "set_note",
  "is_pr",
] as const;

export const WORKOUT_ALIASES: Record<string, readonly string[]> = {
  date: ["workout date"],
  started_at: ["start", "start time"],
  session_id: ["session", "workout id"],
  workout: ["workout name", "day", "routine"],
  duration_min: ["duration", "duration (min)"],
  session_notes: ["workout notes", "workout note"],
  exercise: ["exercise name"],
  exercise_id: [],
  set_number: ["set order", "set", "set no"],
  set_type: ["type", "set kind"],
  weight_kg: ["weight", "weight (kg)", "kg"],
  reps: ["repetitions"],
  rpe: [],
  rest_sec: ["rest", "rest (s)"],
  set_note: ["notes", "note"],
  is_pr: ["pr"],
  // Recognised only to reject them with a clear message (kg only):
  weight_lbs: ["weight (lbs)", "lbs", "weight lbs"],
};

// ---------- export ----------

export function workoutsToCsv(
  sessions: readonly Session[],
  setsBySession: ReadonlyMap<string, readonly WorkoutSet[]>,
  exerciseName: (id: string) => string,
): string {
  const rows: Array<Record<string, string | number | boolean | null>> = [];
  const sorted = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
  for (const s of sorted) {
    const base = {
      date: s.date,
      started_at: new Date(s.startedAt).toISOString(),
      session_id: s.id,
      workout: s.dayName ?? "",
      duration_min: Math.round((s.durationSec / 60) * 10) / 10,
      session_notes: s.notes,
    };
    const sets = setsBySession.get(s.id) ?? [];
    const slots = s.exercises ?? [];
    const ordered = slots.flatMap((slot) => setsForSlot(sets, slot, slots));
    // Sets not attached to any slot (shouldn't happen) are still exported.
    const leftovers = sets.filter((x) => !ordered.includes(x));
    const all = [...ordered, ...leftovers];
    if (all.length === 0) rows.push({ ...base });
    const counters = new Map<string, number>();
    for (const set of all) {
      const n = (counters.get(set.exerciseId) ?? 0) + 1;
      counters.set(set.exerciseId, n);
      rows.push({
        ...base,
        exercise: exerciseName(set.exerciseId),
        exercise_id: set.exerciseId,
        set_number: n,
        set_type: set.type,
        weight_kg: set.weightKg,
        reps: set.reps,
        rpe: set.rpe ?? null,
        rest_sec: set.restSec ?? null,
        set_note: set.note ?? null,
        is_pr: set.isPR ? true : null,
      });
    }
  }
  return toCsv(rows, WORKOUT_COLUMNS);
}

// ---------- import ----------

export interface ImportedSet {
  exerciseId: string;
  type: SetType;
  weightKg: number;
  reps: number;
  rpe: number | null;
  restSec: number | null;
  note: string | null;
}

export interface ImportedSession {
  /** Deterministic id ("imp-…"), so re-importing the same file never duplicates. */
  id: string;
  date: string;
  startedAt: number;
  dayName: string;
  durationSec: number;
  notes: string;
  sets: ImportedSet[];
}

export interface WorkoutImport {
  sessions: ImportedSession[];
  errors: RowError[];
  rowCount: number;
  setCount: number;
}

const SET_TYPE_ALIASES: Record<string, SetType> = {
  working: "working",
  normal: "working",
  "": "working",
  warmup: "warmup",
  "warm up": "warmup",
  "warm-up": "warmup",
  w: "warmup",
  drop: "drop",
  dropset: "drop",
  "drop set": "drop",
  d: "drop",
  failure: "failure",
  f: "failure",
};

export interface ExerciseRef {
  id: string;
  name: string;
}

/**
 * Parse a workout CSV into sessions, validating every row. Invalid rows are reported with their
 * line number and skipped; valid rows are grouped into sessions by `session_id`, or by date +
 * workout name (+ start time) when there is no id.
 */
export function parseWorkoutsCsv(text: string, exercises: readonly ExerciseRef[]): WorkoutImport {
  const { records, columns, parseErrors } = parseCsv(text, WORKOUT_ALIASES);
  const errors: RowError[] = [...parseErrors];
  if (columns.includes("weight_lbs") && !columns.includes("weight_kg")) {
    return {
      sessions: [],
      errors: [
        { line: 1, message: "Weights in lbs aren't supported — convert to kg (weight_kg)." },
      ],
      rowCount: records.length,
      setCount: 0,
    };
  }
  for (const required of ["date", "exercise", "reps"]) {
    if (
      !columns.includes(required) &&
      !(required === "exercise" && columns.includes("exercise_id"))
    ) {
      errors.push({ line: 1, message: `Missing required column "${required}".` });
    }
  }
  if (errors.some((e) => e.line === 1))
    return { sessions: [], errors, rowCount: records.length, setCount: 0 };

  const byName = new Map(exercises.map((e) => [e.name.toLowerCase(), e.id]));
  const byId = new Set(exercises.map((e) => e.id));
  const groups = new Map<string, ImportedSession & { order: number }>();
  let setCount = 0;

  records.forEach((r, i) => {
    const line = i + 2;
    const date = parseDate(r.date);
    if (!date)
      return errors.push({ line, message: `Invalid date "${r.date ?? ""}" — use YYYY-MM-DD.` });

    const exerciseId =
      (r.exercise_id && byId.has(r.exercise_id) ? r.exercise_id : undefined) ??
      byName.get((r.exercise ?? "").toLowerCase()) ??
      (byId.has(slugify(r.exercise ?? "")) ? slugify(r.exercise ?? "") : undefined);
    if (!exerciseId) {
      return errors.push({
        line,
        message: `Unknown exercise "${r.exercise || r.exercise_id || ""}" — add it to the library first.`,
      });
    }

    const reps = num(r.reps);
    const weightKg = num(r.weight_kg) ?? 0;
    const rpe = num(r.rpe);
    const restSec = num(r.rest_sec);
    const type = SET_TYPE_ALIASES[(r.set_type ?? "").toLowerCase()];
    if (reps === null || !Number.isInteger(reps) || reps <= 0 || reps > 1000)
      return errors.push({
        line,
        message: `Reps must be a whole number above 0 (got "${r.reps ?? ""}").`,
      });
    if (!Number.isFinite(weightKg) || weightKg < 0 || weightKg > 1000)
      return errors.push({ line, message: `Weight must be 0–1000 kg (got "${r.weight_kg}").` });
    if (rpe !== null && (!Number.isFinite(rpe) || rpe < 1 || rpe > 10))
      return errors.push({ line, message: `RPE must be 1–10 (got "${r.rpe}").` });
    if (restSec !== null && (!Number.isFinite(restSec) || restSec < 0))
      return errors.push({ line, message: `Rest must be seconds ≥ 0 (got "${r.rest_sec}").` });
    if (!type) return errors.push({ line, message: `Unknown set type "${r.set_type}".` });

    const dayName = (r.workout || "Imported workout").slice(0, 80);
    const startedAt =
      r.started_at && !Number.isNaN(Date.parse(r.started_at))
        ? Date.parse(r.started_at)
        : new Date(`${date.date}T${date.time ?? "12:00"}:00`).getTime();
    const key = r.session_id || `${date.date}|${dayName}|${date.time ?? ""}`;

    let group = groups.get(key);
    if (!group) {
      group = {
        id: `imp-${hashId(key)}`,
        order: groups.size,
        date: date.date,
        startedAt,
        dayName,
        durationSec: Math.min(86_400, parseDurationSec(r.duration_min) ?? 0),
        notes: (r.session_notes ?? "").slice(0, 2000),
        sets: [],
      };
      groups.set(key, group);
    }
    group.sets.push({
      exerciseId,
      type,
      weightKg,
      reps,
      rpe,
      restSec,
      note: r.set_note ? r.set_note.slice(0, 500) : null,
    });
    setCount++;
  });

  const sessions = [...groups.values()]
    .filter((g) => {
      const exerciseCount = new Set(g.sets.map((s) => s.exerciseId)).size;
      if (exerciseCount > 40) {
        errors.push({
          line: 0,
          message: `Workout on ${g.date} has more than 40 exercises — skipped.`,
        });
        setCount -= g.sets.length;
        return false;
      }
      return true;
    })
    .sort((a, b) => a.startedAt - b.startedAt)
    .map(({ order: _order, ...s }) => s);

  return { sessions, errors, rowCount: records.length, setCount };
}
