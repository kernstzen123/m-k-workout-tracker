import { e1rm } from "@/lib/overload/e1rm";
import type { SetType } from "@/lib/schemas/common";
import type { LastSetsDoc, SessionSummary, SetSnapshot } from "@/lib/schemas/session";

/** Warm-ups never count towards volume, tops sets or PRs. */
export function countsAsWork(type: SetType): boolean {
  return type !== "warmup";
}

export function setVolume(set: Pick<SetSnapshot, "type" | "weightKg" | "reps">): number {
  return countsAsWork(set.type) ? set.weightKg * set.reps : 0;
}

/** Total volume (kg × reps) of working sets, rounded to 0.1 kg. */
export function totalVolume(sets: ReadonlyArray<Pick<SetSnapshot, "type" | "weightKg" | "reps">>) {
  return Math.round(sets.reduce((sum, s) => sum + setVolume(s), 0) * 10) / 10;
}

/** Best working set by estimated 1RM (ties → heavier weight). */
export function topSet<T extends Pick<SetSnapshot, "type" | "weightKg" | "reps">>(
  sets: readonly T[],
): T | null {
  let best: T | null = null;
  for (const s of sets) {
    if (!countsAsWork(s.type) || s.reps <= 0) continue;
    if (
      !best ||
      e1rm(s.weightKg, s.reps) > e1rm(best.weightKg, best.reps) ||
      (e1rm(s.weightKg, s.reps) === e1rm(best.weightKg, best.reps) && s.weightKg > best.weightKg)
    ) {
      best = s;
    }
  }
  return best;
}

export function summarize(
  sessionId: string,
  date: string,
  sets: readonly SetSnapshot[],
): SessionSummary | null {
  const top = topSet(sets);
  if (!top) return null;
  return {
    sessionId,
    date,
    topWeightKg: top.weightKg,
    topReps: top.reps,
    e1rm: e1rm(top.weightKg, top.reps),
    volume: totalVolume(sets),
  };
}

export const HISTORY_LENGTH = 6;

/**
 * New `lastSets` doc after finishing a session: these sets become "last time", and the session's
 * summary is appended to a rolling history (newest last) used for stall detection.
 */
export function buildLastSets(
  previous: LastSetsDoc | null,
  sessionId: string,
  date: string,
  sets: readonly SetSnapshot[],
  now: number,
): LastSetsDoc {
  const priorHistory = (previous?.history ?? []).filter((h) => h.sessionId !== sessionId);
  const summary = summarize(sessionId, date, sets);
  const history = summary ? [...priorHistory, summary] : priorHistory;
  return {
    sessionId,
    date,
    sets: sets.slice(0, 30).map(({ type, weightKg, reps, rpe }) => ({
      type,
      weightKg,
      reps,
      rpe: rpe ?? null,
    })),
    history: history.slice(-HISTORY_LENGTH),
    updatedAt: now,
  };
}
