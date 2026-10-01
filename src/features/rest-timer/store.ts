import { create } from "zustand";
import { adjustTimer, startTimer, type RestTimerState } from "@/lib/timer";

const STORAGE_KEY = "mk-rest-timer";

interface Persisted {
  timer: RestTimerState | null;
  label: string | null;
  alerted: boolean;
}

interface RestTimerStore extends Persisted {
  start: (durationSec: number, label: string) => void;
  adjust: (deltaSec: number) => void;
  /** Stop and hide the timer (skip / dismiss). */
  clear: () => void;
  markAlerted: () => void;
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Persisted;
  } catch {
    // Unavailable storage or corrupt value — start fresh.
  }
  return { timer: null, label: null, alerted: false };
}

function save(state: Persisted): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode etc. — the timer still works for this page view.
  }
}

/**
 * Rest timer state. Persisted (end timestamp, not a counter) so it survives reloads, crashes and
 * the app being backgrounded — the remaining time is always recomputed from `endsAt`.
 */
export const useRestTimerStore = create<RestTimerStore>((set, get) => {
  const persist = (next: Persisted) => {
    set(next);
    save(next);
  };
  return {
    ...(typeof window === "undefined" ? { timer: null, label: null, alerted: false } : load()),
    start: (durationSec, label) =>
      persist({ timer: startTimer(durationSec, Date.now()), label, alerted: false }),
    adjust: (deltaSec) => {
      const { timer, label } = get();
      if (!timer) return;
      persist({ timer: adjustTimer(timer, deltaSec, Date.now()), label, alerted: false });
    },
    clear: () => persist({ timer: null, label: null, alerted: false }),
    markAlerted: () => {
      const { timer, label } = get();
      persist({ timer, label, alerted: true });
    },
  };
});
