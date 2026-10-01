import type { MuscleTally } from "@/lib/overload/volume";
import type { Muscle } from "@/lib/schemas/common";
import type {
  LastSetsDoc,
  SessionDoc,
  SessionExercise,
  SetDoc,
  WorkoutSet,
} from "@/lib/schemas/session";
import type { PrDoc } from "@/lib/schemas/stats";
import { buildFinish, type ExerciseInfo } from "@/lib/workout/session";
import { HISTORY_LENGTH } from "@/lib/workout/summary";
import { MAX_REP_RECORDS } from "@/lib/overload/prs";
import type { ImportedSession } from "./workouts";

export interface ImportPlan {
  sessions: Array<{ id: string; doc: SessionDoc; sets: Array<{ id: string; doc: SetDoc }> }>;
  lastSets: Record<string, LastSetsDoc>;
  prs: Record<string, PrDoc>;
  /** weekId → sessionId → muscle tallies (written as idempotent per-session entries). */
  weekly: Record<string, Record<string, Partial<Record<Muscle, MuscleTally>>>>;
}

/** Turn an imported session into the same docs a finished in-app workout has. */
function toDocs(s: ImportedSession): { session: SessionDoc; sets: WorkoutSet[] } {
  const slotKeyOf = new Map<string, string>();
  const slots: SessionExercise[] = [];
  const sets: WorkoutSet[] = [];
  const orderInSlot = new Map<string, number>();
  s.sets.forEach((set, i) => {
    let key = slotKeyOf.get(set.exerciseId);
    if (!key) {
      key = `i${slots.length}`;
      slotKeyOf.set(set.exerciseId, key);
      slots.push({
        key,
        exerciseId: set.exerciseId,
        targetSets: 0,
        repMin: set.reps,
        repMax: set.reps,
      });
    }
    const slot = slots.find((x) => x.key === key)!;
    slot.targetSets = Math.min(20, slot.targetSets + 1);
    slot.repMin = Math.min(slot.repMin, set.reps, 100);
    slot.repMax = Math.min(100, Math.max(slot.repMax, set.reps));
    const order = orderInSlot.get(key) ?? 0;
    orderInSlot.set(key, order + 1);
    sets.push({
      id: `${s.id}-${i}`,
      exerciseId: set.exerciseId,
      slotKey: key,
      order,
      type: set.type,
      weightKg: set.weightKg,
      reps: set.reps,
      rpe: set.rpe,
      restSec: set.restSec,
      note: set.note,
      completedAt: s.startedAt,
    });
  });
  return {
    session: {
      date: s.date,
      dayId: null,
      dayName: s.dayName,
      programVersion: null,
      exercises: slots,
      startedAt: s.startedAt,
      finishedAt: null,
      durationSec: s.durationSec,
      totalVolume: 0,
      notes: s.notes,
      status: "draft",
    },
    sets,
  };
}

/** Best of two PR records (per field), keeping the date of whichever side won. */
export function mergePrs(a: PrDoc | null | undefined, b: PrDoc): PrDoc {
  if (!a) return b;
  const repsAtWeight: Record<string, number> = { ...a.repsAtWeight };
  for (const [k, v] of Object.entries(b.repsAtWeight))
    repsAtWeight[k] = Math.max(repsAtWeight[k] ?? 0, v);
  for (const k of Object.keys(repsAtWeight)
    .map(Number)
    .sort((x, y) => y - x)
    .slice(MAX_REP_RECORDS))
    delete repsAtWeight[String(k)];

  const weightWinner = b.bestWeight > a.bestWeight ? b : a;
  const bestReps =
    a.bestWeight === b.bestWeight ? Math.max(a.bestReps, b.bestReps) : weightWinner.bestReps;
  const e1rmWinner = b.bestE1RM > a.bestE1RM ? b : a;
  const volumeWinner = b.bestVolume > a.bestVolume ? b : a;
  const latest = (x?: string, y?: string) => (!x ? y : !y ? x : x > y ? x : y);
  return {
    bestWeight: weightWinner.bestWeight,
    bestReps,
    bestE1RM: e1rmWinner.bestE1RM,
    bestVolume: volumeWinner.bestVolume,
    repsAtWeight,
    dates: {
      ...(weightWinner.dates.weight ? { weight: weightWinner.dates.weight } : {}),
      ...(latest(a.dates.reps, b.dates.reps) ? { reps: latest(a.dates.reps, b.dates.reps)! } : {}),
      ...(e1rmWinner.dates.e1rm ? { e1rm: e1rmWinner.dates.e1rm } : {}),
      ...(volumeWinner.dates.volume ? { volume: volumeWinner.dates.volume } : {}),
    },
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
}

/** Merge histories chronologically; "last time" stays the most recent session overall. */
export function mergeLastSets(
  existing: LastSetsDoc | null | undefined,
  imported: LastSetsDoc,
): LastSetsDoc {
  if (!existing) return imported;
  const byId = new Map(existing.history.map((h) => [h.sessionId, h]));
  for (const h of imported.history) byId.set(h.sessionId, h);
  const history = [...byId.values()]
    .sort((x, y) => x.date.localeCompare(y.date))
    .slice(-HISTORY_LENGTH);
  const latest = imported.date > existing.date ? imported : existing;
  return { ...latest, history, updatedAt: Math.max(existing.updatedAt, imported.updatedAt) };
}

/**
 * Build every write for importing sessions (oldest first): session + set docs, PR flags, merged
 * `lastSets` / `prs` (with what already exists), and per-session weekly muscle tallies.
 * Pass sessions that don't exist yet; every write is idempotent anyway.
 */
export function planWorkoutImport(
  sessions: readonly ImportedSession[],
  existingLastSets: Readonly<Record<string, LastSetsDoc | null | undefined>>,
  existingPrs: Readonly<Record<string, PrDoc | null | undefined>>,
  exerciseInfo: (id: string) => ExerciseInfo | undefined,
  now: number,
): ImportPlan {
  // Replay the imported sessions among themselves (oldest first) — PR flags are relative to
  // earlier imported sessions; the result is then merged with what's already stored.
  const runLast: Record<string, LastSetsDoc | null> = {};
  const runPrs: Record<string, PrDoc | null> = {};
  const plan: ImportPlan = { sessions: [], lastSets: {}, prs: {}, weekly: {} };

  for (const s of [...sessions].sort((a, b) => a.startedAt - b.startedAt)) {
    const { session, sets } = toDocs(s);
    const result = buildFinish({
      sessionId: s.id,
      session,
      sets,
      previousLastSets: runLast,
      previousPrs: runPrs,
      exerciseInfo,
      notes: s.notes,
      now,
    });
    Object.assign(runLast, result.lastSets);
    Object.assign(runPrs, result.prs);
    const prIds = new Set(result.prSetIds);
    plan.sessions.push({
      id: s.id,
      doc: {
        ...result.session,
        // Keep the original timing, not "now".
        finishedAt: s.startedAt + s.durationSec * 1000,
        durationSec: s.durationSec,
        updatedAt: now,
      },
      sets: sets.map(({ id, ...doc }) => ({
        id,
        doc: { ...doc, ...(prIds.has(id) ? { isPR: true } : {}) },
      })),
    });
    plan.weekly[result.weekId] = { ...plan.weekly[result.weekId], [s.id]: result.weekly };
  }

  for (const [id, doc] of Object.entries(runLast)) {
    if (doc) plan.lastSets[id] = mergeLastSets(existingLastSets[id], doc);
  }
  for (const [id, doc] of Object.entries(runPrs)) {
    if (doc) plan.prs[id] = mergePrs(existingPrs[id], doc);
  }
  return plan;
}
