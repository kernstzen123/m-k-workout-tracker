import { describe, expect, it } from "vitest";
import type { LastSetsDoc } from "@/lib/schemas/session";
import type { PrDoc } from "@/lib/schemas/stats";
import { mergeLastSets, mergePrs, planWorkoutImport } from "./plan";
import type { ImportedSession } from "./workouts";

const info = (id: string) =>
  id === "back-squat" ? { muscle: "quads" as const, secondary: ["glutes" as const] } : undefined;

const session = (id: string, date: string, weight: number, reps: number): ImportedSession => ({
  id,
  date,
  startedAt: new Date(`${date}T12:00:00`).getTime(),
  dayName: "Lower A",
  durationSec: 3000,
  notes: "",
  sets: [
    {
      exerciseId: "back-squat",
      type: "working",
      weightKg: weight,
      reps,
      rpe: null,
      restSec: null,
      note: null,
    },
  ],
});

describe("planWorkoutImport", () => {
  it("builds session + set docs with original timing and status done", () => {
    const plan = planWorkoutImport([session("imp-a", "2026-01-05", 100, 5)], {}, {}, info, 99);
    const s = plan.sessions[0]!;
    expect(s.doc).toMatchObject({
      status: "done",
      durationSec: 3000,
      totalVolume: 500,
      setCount: 1,
      dayName: "Lower A",
    });
    expect(s.doc.finishedAt).toBe(s.doc.startedAt + 3_000_000);
    expect(s.sets[0]).toMatchObject({
      id: "imp-a-0",
      doc: { slotKey: "i0", order: 0, weightKg: 100 },
    });
  });

  it("flags PRs relative to earlier imported sessions and tallies weekly volume", () => {
    const plan = planWorkoutImport(
      [session("imp-b", "2026-01-12", 105, 5), session("imp-a", "2026-01-05", 100, 5)],
      {},
      {},
      info,
      99,
    );
    expect(plan.sessions.map((s) => s.id)).toEqual(["imp-a", "imp-b"]); // oldest first
    expect(plan.sessions[1]!.sets[0]!.doc.isPR).toBe(true);
    expect(plan.prs["back-squat"]!.bestWeight).toBe(105);
    expect(Object.keys(plan.weekly)).toHaveLength(2);
    expect(Object.values(plan.weekly)[0]!["imp-a"]!.quads).toEqual({ sets: 1, volume: 500 });
  });

  it("merges with existing records and keeps the newer 'last time'", () => {
    const existingLast: LastSetsDoc = {
      sessionId: "live",
      date: "2026-03-01",
      sets: [{ type: "working", weightKg: 120, reps: 5 }],
      history: [
        {
          sessionId: "live",
          date: "2026-03-01",
          topWeightKg: 120,
          topReps: 5,
          e1rm: 140,
          volume: 600,
        },
      ],
      updatedAt: 5,
    };
    const existingPr: PrDoc = {
      bestWeight: 120,
      bestReps: 5,
      bestE1RM: 140,
      bestVolume: 600,
      repsAtWeight: { "120": 5 },
      dates: { weight: "2026-03-01", e1rm: "2026-03-01", volume: "2026-03-01" },
      updatedAt: 5,
    };
    const plan = planWorkoutImport(
      [session("imp-a", "2026-01-05", 100, 8)],
      { "back-squat": existingLast },
      { "back-squat": existingPr },
      info,
      99,
    );
    const last = plan.lastSets["back-squat"]!;
    expect(last.sessionId).toBe("live"); // newer live session stays "last time"
    expect(last.history.map((h) => h.sessionId)).toEqual(["imp-a", "live"]);
    const pr = plan.prs["back-squat"]!;
    expect(pr.bestWeight).toBe(120);
    expect(pr.repsAtWeight).toEqual({ "120": 5, "100": 8 });
  });
});

describe("mergePrs / mergeLastSets", () => {
  const pr = (bestWeight: number, bestReps: number, e1: number, date: string): PrDoc => ({
    bestWeight,
    bestReps,
    bestE1RM: e1,
    bestVolume: e1 * 5,
    repsAtWeight: { [String(bestWeight)]: bestReps },
    dates: { weight: date, e1rm: date, volume: date },
    updatedAt: 1,
  });

  it("takes the best of each field with its date", () => {
    const m = mergePrs(pr(100, 5, 116, "2026-01-01"), pr(100, 7, 123, "2025-06-01"));
    expect(m).toMatchObject({ bestWeight: 100, bestReps: 7, bestE1RM: 123 });
    expect(m.dates.e1rm).toBe("2025-06-01");
    expect(m.dates.weight).toBe("2026-01-01");
  });

  it("returns the imported doc when nothing exists", () => {
    const p = pr(50, 5, 58, "2025-01-01");
    expect(mergePrs(null, p)).toBe(p);
    const l: LastSetsDoc = {
      sessionId: "x",
      date: "2025-01-01",
      sets: [],
      history: [],
      updatedAt: 1,
    };
    expect(mergeLastSets(undefined, l)).toBe(l);
  });
});
