"use client";

import { BellRing, Minus, Plus, SkipForward, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatClock, isFinished, progress, remainingSec } from "@/lib/timer";
import { alertRestOver } from "./alerts";
import { useRestTimerStore } from "./store";

/** Re-render every 250 ms while active (display only — the source of truth is `endsAt`). */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/**
 * Fires the "rest over" alert exactly once per timer — from a timeout scheduled at `endsAt`,
 * and again on every return to the foreground (iOS pauses background JS; Android may throttle).
 */
export function RestTimerEngine() {
  const timer = useRestTimerStore((s) => s.timer);
  const alerted = useRestTimerStore((s) => s.alerted);

  useEffect(() => {
    if (!timer || alerted) return;
    const check = () => {
      const s = useRestTimerStore.getState();
      if (s.timer && !s.alerted && isFinished(s.timer, Date.now())) {
        s.markAlerted();
        alertRestOver(s.label ?? "");
      }
    };
    const id = setTimeout(check, Math.max(0, timer.endsAt - Date.now()) + 50);
    const backup = setInterval(check, 1000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    check();
    return () => {
      clearTimeout(id);
      clearInterval(backup);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [timer, alerted]);

  return null;
}

/** Floating rest-timer bar above the bottom navigation. */
export function RestTimerBar() {
  const { timer, label, adjust, clear } = useRestTimerStore();
  const pathname = usePathname();
  const now = useNow(timer !== null);
  // The program editor has its own bottom action bar; the timer keeps running (and alerting).
  if (!timer || pathname.startsWith("/program")) return null;

  const done = isFinished(timer, now);
  const left = remainingSec(timer, now);
  const pct = Math.round(progress(timer, now) * 100);

  return (
    <section
      aria-label="Rest timer"
      className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-3 pb-2"
    >
      <div
        className={
          "mx-auto max-w-lg overflow-hidden rounded-2xl border shadow-2xl " +
          (done ? "border-accent bg-accent text-accent-fg" : "border-border-strong bg-surface")
        }
      >
        {!done ? (
          <div
            className="h-1 bg-accent transition-[width] duration-200 ease-linear"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-label="Rest elapsed"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        ) : null}
        <div className="flex items-center gap-2 p-2 pl-4">
          {done ? (
            <>
              <BellRing aria-hidden className="size-6 shrink-0" />
              <p className="min-w-0 flex-1" role="alert">
                <span className="block font-display text-xl font-semibold tracking-wide uppercase">
                  Rest over
                </span>
                {label ? <span className="block truncate text-sm">Next: {label}</span> : null}
              </p>
              <button
                type="button"
                aria-label="Dismiss rest timer"
                onClick={clear}
                className="inline-flex size-12 items-center justify-center rounded-xl transition-colors hover:bg-accent-strong"
              >
                <X aria-hidden className="size-6" />
              </button>
            </>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-wider text-muted uppercase">Rest</p>
                <p
                  className="tabular font-display text-4xl leading-none font-semibold"
                  aria-live="off"
                >
                  {formatClock(left)}
                </p>
                {label ? (
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted">Next: {label}</p>
                ) : null}
              </div>
              <Button
                variant="secondary"
                className="px-3"
                aria-label="Remove 15 seconds"
                onClick={() => adjust(-15)}
              >
                <Minus aria-hidden />
                15
              </Button>
              <Button
                variant="secondary"
                className="px-3"
                aria-label="Add 15 seconds"
                onClick={() => adjust(15)}
              >
                <Plus aria-hidden />
                15
              </Button>
              <Button variant="ghost" className="px-3" aria-label="Skip rest" onClick={clear}>
                <SkipForward aria-hidden />
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
