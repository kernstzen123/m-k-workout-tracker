import type { SetType } from "@/lib/schemas/common";
import type { SetSnapshot } from "@/lib/schemas/session";

export interface PrefillValues {
  weightKg: number | null;
  reps: number | null;
  type: SetType;
}

/**
 * Values for the next un-logged row of an exercise:
 *  1. the matching set from last session (same position), else its last set;
 *  2. otherwise the previous set logged today;
 *  3. otherwise an empty weight and the bottom of the rep range.
 * Logged-today values win for weight when they differ from last time's (the lifter already
 * adjusted the load this session).
 */
export function prefillRow(
  rowIndex: number,
  loggedToday: readonly SetSnapshot[],
  lastTime: readonly SetSnapshot[] | null,
  repMin: number,
): PrefillValues {
  const fromLast = lastTime?.[rowIndex] ?? lastTime?.at(-1) ?? null;
  const previousToday = loggedToday.at(-1) ?? null;

  if (fromLast) {
    const adjustedToday =
      previousToday &&
      previousToday.type === fromLast.type &&
      previousToday.weightKg !== lastTime?.[rowIndex - 1]?.weightKg;
    return {
      weightKg: adjustedToday ? previousToday.weightKg : fromLast.weightKg,
      reps: fromLast.reps,
      type: fromLast.type,
    };
  }
  if (previousToday) {
    return {
      weightKg: previousToday.weightKg,
      reps: previousToday.reps,
      type: previousToday.type === "warmup" ? "working" : previousToday.type,
    };
  }
  return { weightKg: null, reps: repMin > 0 ? repMin : null, type: "working" };
}
