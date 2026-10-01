import { describe, expect, it } from "vitest";
import { consistency, lastWeeks, movingAverage, weeklyCardioTotals } from "./trends";

// Wednesday 1 Oct 2026 (ISO week 40, Monday 28 Sep).
const NOW = new Date(2026, 9, 1, 12);
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 18).getTime();

describe("movingAverage", () => {
  it("averages entries within the trailing 7 calendar days, sorted oldest first", () => {
    const out = movingAverage([
      { date: "2026-09-10", value: 80 },
      { date: "2026-09-01", value: 82 },
      { date: "2026-09-05", value: 81 },
    ]);
    expect(out.map((o) => o.date)).toEqual(["2026-09-01", "2026-09-05", "2026-09-10"]);
    expect(out.map((o) => o.avg)).toEqual([82, 81.5, 80.5]); // 1 Sep falls out of 10 Sep's window
  });

  it("handles several weigh-ins on one day", () => {
    const out = movingAverage([
      { date: "2026-09-01", value: 80 },
      { date: "2026-09-01", value: 81 },
    ]);
    expect(out.every((o) => o.avg === 80.5)).toBe(true);
  });
});

describe("lastWeeks", () => {
  it("returns ISO weeks ending with the current one", () => {
    const weeks = lastWeeks(3, NOW);
    expect(weeks.map((w) => w.weekId)).toEqual(["2026-W38", "2026-W39", "2026-W40"]);
    expect(weeks.at(-1)?.start).toBe("2026-09-28");
  });
});

describe("weeklyCardioTotals", () => {
  it("sums minutes and distance per week, zero-filling empty weeks", () => {
    const out = weeklyCardioTotals(
      [
        { date: "2026-09-29", durationMin: 20, distanceKm: 2.5 },
        { date: "2026-10-01", durationMin: 15 },
        { date: "2026-09-15", durationMin: 30, distanceKm: 5 },
        { date: "2026-01-01", durationMin: 99 }, // out of range
      ],
      3,
      NOW,
    );
    expect(out.map((w) => [w.weekId, w.minutes, w.distanceKm, w.entries])).toEqual([
      ["2026-W38", 30, 5, 1],
      ["2026-W39", 0, 0, 0],
      ["2026-W40", 35, 2.5, 2],
    ]);
  });
});

describe("consistency", () => {
  const s = (t: number, durationSec = 3600, avgRestSec: number | null = 120) => ({
    startedAt: t,
    durationSec,
    avgRestSec,
  });

  it("counts sessions per week, the weekly streak and averages", () => {
    const c = consistency(
      [
        s(at(2026, 9, 29)),
        s(at(2026, 9, 30), 1800, 90),
        s(at(2026, 9, 22)),
        s(at(2026, 9, 15)),
        s(at(2026, 9, 1)), // gap week before → streak stops at 3
      ],
      4,
      NOW,
    );
    // Weeks of 7, 14, 21 and 28 Sep (1 Sep is outside the 4-week window).
    expect(c.weeks.map((w) => w.sessions)).toEqual([0, 1, 1, 2]);
    expect(c.thisWeek).toBe(2);
    expect(c.streakWeeks).toBe(3);
    expect(c.avgDurationSec).toBe(3240);
    expect(c.avgRestSec).toBe(114);
  });

  it("does not break the streak just because this week has no workout yet", () => {
    const c = consistency([s(at(2026, 9, 22)), s(at(2026, 9, 15))], 4, NOW);
    expect(c.thisWeek).toBe(0);
    expect(c.streakWeeks).toBe(2);
  });

  it("handles no data", () => {
    const c = consistency([], 4, NOW);
    expect(c).toMatchObject({
      streakWeeks: 0,
      thisWeek: 0,
      avgDurationSec: null,
      avgRestSec: null,
    });
  });
});
