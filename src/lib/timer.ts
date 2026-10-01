/**
 * Rest-timer math. Everything derives from absolute timestamps (`endsAt`), never from counting
 * intervals, so the timer stays correct when the app is backgrounded, throttled or reloaded.
 */

export interface RestTimerState {
  startedAt: number;
  endsAt: number;
  /** Planned duration in seconds (after any ± adjustments). */
  durationSec: number;
}

export function startTimer(durationSec: number, now: number): RestTimerState {
  const d = Math.max(0, Math.round(durationSec));
  return { startedAt: now, endsAt: now + d * 1000, durationSec: d };
}

/** Whole seconds left (rounded up, so "0:01" shows until the very end). */
export function remainingSec(state: RestTimerState, now: number): number {
  return Math.max(0, Math.ceil((state.endsAt - now) / 1000));
}

export function isFinished(state: RestTimerState, now: number): boolean {
  return now >= state.endsAt;
}

/** 0 → 1 progress through the rest period. */
export function progress(state: RestTimerState, now: number): number {
  const total = state.endsAt - state.startedAt;
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (now - state.startedAt) / total));
}

/** Add or remove time (e.g. ±15 s). Never ends in the past relative to `now`. */
export function adjustTimer(state: RestTimerState, deltaSec: number, now: number): RestTimerState {
  const endsAt = Math.max(now, state.endsAt + deltaSec * 1000);
  return { ...state, endsAt, durationSec: Math.round((endsAt - state.startedAt) / 1000) };
}

/** `m:ss` clock text. */
export function formatClock(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const m = Math.floor(sec / 60);
  return `${m}:${String(sec % 60).padStart(2, "0")}`;
}

/** Rests longer than this are treated as a break, not rest, and not recorded. */
export const MAX_RECORDED_REST_SEC = 30 * 60;

/** Actual rest taken before a set: time since the previous completed set in the session. */
export function actualRestSec(previousCompletedAt: number | null, now: number): number | null {
  if (previousCompletedAt === null || now < previousCompletedAt) return null;
  const sec = Math.round((now - previousCompletedAt) / 1000);
  return sec > MAX_RECORDED_REST_SEC ? null : sec;
}
