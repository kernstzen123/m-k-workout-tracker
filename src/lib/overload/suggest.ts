import type { SessionSummary, SetSnapshot } from "@/lib/schemas/session";

/**
 * Progressive-overload suggestions. Pure and deterministic; the UI shows them as dismissible
 * chips and never applies them automatically.
 */
export type Suggestion =
  | { kind: "increase-weight"; weightKg: number; reps: number; reason: string }
  | { kind: "add-rep"; setIndex: number; weightKg: number; reps: number; reason: string }
  | { kind: "repeat"; weightKg: number; reason: string }
  | { kind: "deload"; weightKg: number; reason: string }
  | { kind: "variation"; reason: string };

export interface SuggestInput {
  /** Last session's sets for the exercise, in order (all types). */
  lastSets: readonly SetSnapshot[];
  repMin: number;
  repMax: number;
  incrementKg: number;
  /** Rolling per-session summaries, oldest first (for stall detection). */
  history?: readonly SessionSummary[];
}

/** RPE at or below this counts as "had reps in reserve" for a weight increase. */
export const MAX_RPE_FOR_INCREASE = 8;
export const DELOAD_FACTOR = 0.9;
export const STALL_SESSIONS = 3;

/** Round to the nearest multiple of `step` (2 decimals), or to 0.5 kg when there's no step. */
export function roundToStep(weightKg: number, step: number, mode: "nearest" | "down" = "nearest") {
  const s = step > 0 ? step : 0.5;
  const fn = mode === "down" ? Math.floor : Math.round;
  return Math.round(fn(weightKg / s + 1e-9) * s * 100) / 100;
}

/**
 * Stalled when the latest `STALL_SESSIONS` sessions show no progress: none of the later sessions
 * beat the first one's estimated 1RM or volume.
 */
export function isStalled(history: readonly SessionSummary[]): boolean {
  if (history.length < STALL_SESSIONS) return false;
  const [first, ...rest] = history.slice(-STALL_SESSIONS);
  if (!first) return false;
  return rest.every((h) => h.e1rm <= first.e1rm && h.volume <= first.volume);
}

export function suggest({
  lastSets,
  repMin,
  repMax,
  incrementKg,
  history = [],
}: SuggestInput): Suggestion[] {
  const working = lastSets.filter((s) => s.type === "working" && s.reps > 0);
  if (working.length === 0 || repMax <= 0) return [];

  const topWeight = Math.max(...working.map((s) => s.weightKg));
  const out: Suggestion[] = [];

  const allAtTop = working.every((s) => s.reps >= repMax);
  const easyEnough = working.every((s) => s.rpe == null || s.rpe <= MAX_RPE_FOR_INCREASE);
  const anyBelow = working.some((s) => s.reps < repMin);

  if (allAtTop && easyEnough && incrementKg > 0) {
    out.push({
      kind: "increase-weight",
      // Add the increment to what was lifted (no snapping — the lifter may use off-grid plates).
      weightKg: Math.round((topWeight + incrementKg) * 100) / 100,
      reps: repMin,
      reason: `All sets hit ${repMax} reps${working.some((s) => s.rpe != null) ? ` at RPE ≤ ${MAX_RPE_FOR_INCREASE}` : ""} — add ${incrementKg} kg.`,
    });
  } else if (anyBelow) {
    out.push({
      kind: "repeat",
      weightKg: topWeight,
      reason: `Below ${repMin} reps last time — repeat ${topWeight} kg and build up.`,
    });
  } else {
    // Within range (or at the top but too hard / no increment): add a rep to the weakest set.
    let weakest = 0;
    working.forEach((s, i) => {
      if (s.reps < working[weakest]!.reps) weakest = i;
    });
    const set = working[weakest]!;
    const setIndex = lastSets.indexOf(set);
    out.push({
      kind: "add-rep",
      setIndex,
      weightKg: set.weightKg,
      reps: set.reps + 1,
      reason:
        allAtTop && !easyEnough
          ? `Top of the range but RPE was high — consolidate: +1 rep on your weakest set.`
          : `In range — aim for +1 rep on your weakest set.`,
    });
  }

  if (isStalled(history)) {
    out.push({
      kind: "deload",
      weightKg: roundToStep(topWeight * DELOAD_FACTOR, incrementKg, "down"),
      reason: `No progress in ${STALL_SESSIONS} sessions — deload 10% and build back up.`,
    });
    out.push({ kind: "variation", reason: "Or switch to a variation for a few weeks." });
  }

  return out;
}
