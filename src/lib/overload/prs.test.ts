import { describe, expect, it } from "vitest";
import type { SetSnapshot } from "@/lib/schemas/session";
import type { PrDoc } from "@/lib/schemas/stats";
import { detectPrs } from "./prs";

const w = (weightKg: number, reps: number, type: SetSnapshot["type"] = "working"): SetSnapshot => ({
  type,
  weightKg,
  reps,
});

const baseline = (): PrDoc => detectPrs(null, [w(80, 8), w(80, 8), w(80, 7)], "2026-09-01", 1).next;

describe("detectPrs", () => {
  it("records a baseline on the first session without celebrating", () => {
    const { next, hits, prSetIndexes } = detectPrs(
      null,
      [w(40, 10, "warmup"), w(80, 8)],
      "2026-09-01",
      1,
    );
    expect(hits).toEqual([]);
    expect(prSetIndexes).toEqual([]);
    expect(next).toMatchObject({ bestWeight: 80, bestReps: 8, bestE1RM: 101.3, bestVolume: 640 });
    expect(next.repsAtWeight).toEqual({ "80": 8 });
  });

  it("detects a heaviest-weight PR", () => {
    const { hits, prSetIndexes, next } = detectPrs(baseline(), [w(82.5, 6)], "2026-09-08", 2);
    expect(hits.map((h) => h.kind)).toContain("weight");
    expect(prSetIndexes).toEqual([0]);
    expect(next.bestWeight).toBe(82.5);
    expect(next.dates.weight).toBe("2026-09-08");
  });

  it("detects more reps at a weight done before", () => {
    const { hits } = detectPrs(baseline(), [w(80, 9), w(80, 8)], "2026-09-08", 2);
    const reps = hits.find((h) => h.kind === "reps");
    expect(reps).toMatchObject({ value: 9, previous: 8, atWeightKg: 80 });
  });

  it("does not count reps at a never-used weight as a rep PR", () => {
    const { hits, next } = detectPrs(baseline(), [w(70, 12)], "2026-09-08", 2);
    expect(hits.some((h) => h.kind === "reps")).toBe(false);
    expect(next.repsAtWeight["70"]).toBe(12);
  });

  it("detects e1RM and session-volume PRs", () => {
    const { hits } = detectPrs(baseline(), [w(80, 9), w(80, 9), w(80, 8)], "2026-09-08", 2);
    expect(hits.map((h) => h.kind).sort()).toEqual(["e1rm", "reps", "volume"]);
  });

  it("ignores warm-ups and reports nothing for an equal session", () => {
    const { hits } = detectPrs(
      baseline(),
      [w(100, 5, "warmup"), w(80, 8), w(80, 8), w(80, 7)],
      "2026-09-08",
      2,
    );
    expect(hits).toEqual([]);
  });

  it("keeps the rep table bounded to the heaviest weights", () => {
    let doc: PrDoc | null = null;
    for (let kg = 10; kg <= 120; kg += 2.5) doc = detectPrs(doc, [w(kg, 5)], "2026-09-01", 1).next;
    const weights = Object.keys(doc!.repsAtWeight).map(Number);
    expect(weights).toHaveLength(40);
    expect(Math.min(...weights)).toBe(22.5);
  });
});
