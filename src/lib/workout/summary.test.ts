import { describe, expect, it } from "vitest";
import type { LastSetsDoc, SetSnapshot } from "@/lib/schemas/session";
import { buildLastSets, summarize, topSet, totalVolume } from "./summary";

const s = (weightKg: number, reps: number, type: SetSnapshot["type"] = "working"): SetSnapshot => ({
  type,
  weightKg,
  reps,
});

describe("volume", () => {
  it("sums weight × reps, excluding warm-ups", () => {
    expect(totalVolume([s(20, 10, "warmup"), s(60, 8), s(60, 7), s(40, 12, "drop")])).toBe(
      60 * 8 + 60 * 7 + 40 * 12,
    );
  });

  it("rounds to 0.1 kg", () => {
    expect(totalVolume([s(22.25, 3)])).toBe(66.8);
  });
});

describe("topSet", () => {
  it("picks the highest e1RM working set", () => {
    expect(topSet([s(100, 3), s(90, 8), s(120, 1, "warmup")])).toEqual(s(90, 8));
  });

  it("returns null without working sets", () => {
    expect(topSet([s(20, 10, "warmup")])).toBeNull();
    expect(topSet([])).toBeNull();
  });
});

describe("buildLastSets", () => {
  it("records the sets and appends a summary to history", () => {
    const doc = buildLastSets(null, "s1", "2026-10-01", [s(20, 10, "warmup"), s(60, 8)], 1);
    expect(doc.sets).toHaveLength(2);
    expect(doc.history).toEqual([summarize("s1", "2026-10-01", [s(60, 8)])]);
  });

  it("keeps a rolling window of 6 and replaces a re-finished session", () => {
    let doc: LastSetsDoc | null = null;
    for (let i = 1; i <= 8; i++) doc = buildLastSets(doc, `s${i}`, "2026-10-01", [s(50 + i, 5)], i);
    expect(doc!.history.map((h) => h.sessionId)).toEqual(["s3", "s4", "s5", "s6", "s7", "s8"]);

    doc = buildLastSets(doc, "s8", "2026-10-01", [s(70, 5)], 9);
    expect(doc.history).toHaveLength(6);
    expect(doc.history.at(-1)?.topWeightKg).toBe(70);
  });

  it("keeps history when a session only had warm-ups", () => {
    const prev = buildLastSets(null, "s1", "2026-10-01", [s(60, 8)], 1);
    const doc = buildLastSets(prev, "s2", "2026-10-02", [s(20, 10, "warmup")], 2);
    expect(doc.history).toHaveLength(1);
    expect(doc.sessionId).toBe("s2");
  });
});
