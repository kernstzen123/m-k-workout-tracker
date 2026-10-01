import { describe, expect, it } from "vitest";
import type { PrDoc } from "@/lib/schemas/stats";
import { buildComparison, mergeTrend } from "./compare";

const pr = (bestWeight: number, bestReps: number, bestE1RM: number): PrDoc => ({
  bestWeight,
  bestReps,
  bestE1RM,
  bestVolume: bestWeight * bestReps * 3,
  repsAtWeight: {},
  dates: {},
  updatedAt: 1,
});

describe("buildComparison", () => {
  it("lists key lifts first, then exercises both have done, strongest first", () => {
    const mine = {
      "barbell-bench-press": pr(80, 8, 101.3),
      "leg-press": pr(200, 10, 266.7),
      "cable-crunch": pr(40, 15, 60),
      "hammer-curl": pr(16, 10, 21.3),
    };
    const theirs = {
      "back-squat": pr(70, 6, 84),
      "leg-press": pr(150, 12, 210),
      "hammer-curl": pr(10, 12, 14),
    };
    const rows = buildComparison(mine, theirs, "e1rm");
    expect(rows.map((r) => r.exerciseId)).toEqual([
      "back-squat", // key lift, only theirs
      "barbell-bench-press", // key lift, only mine
      "leg-press",
      "hammer-curl",
    ]);
    expect(rows[0]).toMatchObject({ mine: null, theirs: 84 });
  });

  it("shows weight × reps details for the heaviest-weight metric", () => {
    const rows = buildComparison(
      { deadlift: pr(140, 3, 154) },
      { deadlift: pr(100, 5, 116.7) },
      "weight",
    );
    expect(rows[0]).toMatchObject({
      mine: 140,
      theirs: 100,
      mineDetail: "140 kg × 3",
      theirsDetail: "100 kg × 5",
    });
  });
});

describe("mergeTrend", () => {
  it("merges two histories by date", () => {
    const h = (date: string, e1rm: number) => ({
      sessionId: date,
      date,
      topWeightKg: 0,
      topReps: 0,
      e1rm,
      volume: 0,
    });
    expect(
      mergeTrend(
        [h("2026-01-01", 100), h("2026-01-08", 102)],
        [h("2026-01-01", 80), h("2026-01-05", 82)],
      ),
    ).toEqual([
      { date: "2026-01-01", mine: 100, theirs: 80 },
      { date: "2026-01-05", theirs: 82 },
      { date: "2026-01-08", mine: 102 },
    ]);
  });
});
