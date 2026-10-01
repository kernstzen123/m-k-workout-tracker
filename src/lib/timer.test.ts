import { describe, expect, it } from "vitest";
import {
  actualRestSec,
  adjustTimer,
  formatClock,
  isFinished,
  progress,
  remainingSec,
  startTimer,
} from "./timer";

const T0 = 1_700_000_000_000;

describe("rest timer", () => {
  it("counts down from absolute timestamps", () => {
    const t = startTimer(90, T0);
    expect(remainingSec(t, T0)).toBe(90);
    expect(remainingSec(t, T0 + 30_000)).toBe(60);
    // Rounded up: 0.2 s left still shows 1 s.
    expect(remainingSec(t, T0 + 89_800)).toBe(1);
    expect(isFinished(t, T0 + 89_999)).toBe(false);
    expect(isFinished(t, T0 + 90_000)).toBe(true);
  });

  it("survives backgrounding: elapsed time is computed, not counted", () => {
    const t = startTimer(120, T0);
    // App suspended for 5 minutes — no ticks happened at all.
    expect(remainingSec(t, T0 + 300_000)).toBe(0);
    expect(isFinished(t, T0 + 300_000)).toBe(true);
    expect(progress(t, T0 + 300_000)).toBe(1);
  });

  it("reports progress from 0 to 1", () => {
    const t = startTimer(100, T0);
    expect(progress(t, T0)).toBe(0);
    expect(progress(t, T0 + 25_000)).toBe(0.25);
    expect(progress(startTimer(0, T0), T0)).toBe(1);
  });

  it("adjusts by ±15 s without ending in the past", () => {
    const t = startTimer(60, T0);
    const plus = adjustTimer(t, 15, T0 + 10_000);
    expect(remainingSec(plus, T0 + 10_000)).toBe(65);
    expect(plus.durationSec).toBe(75);

    const minus = adjustTimer(t, -15, T0 + 50_000);
    expect(remainingSec(minus, T0 + 50_000)).toBe(0);
    expect(minus.endsAt).toBe(T0 + 50_000);
  });

  it("formats m:ss", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(75)).toBe("1:15");
    expect(formatClock(600)).toBe("10:00");
  });

  it("records the actual rest taken, ignoring long breaks", () => {
    expect(actualRestSec(null, T0)).toBeNull();
    expect(actualRestSec(T0, T0 + 95_400)).toBe(95);
    expect(actualRestSec(T0, T0 + 31 * 60_000)).toBeNull();
    expect(actualRestSec(T0 + 1000, T0)).toBeNull();
  });
});
