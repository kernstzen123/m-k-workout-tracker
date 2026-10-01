import { describe, expect, it } from "vitest";
import type { SetSnapshot } from "@/lib/schemas/session";
import { prefillRow } from "./prefill";

const s = (weightKg: number, reps: number, type: SetSnapshot["type"] = "working"): SetSnapshot => ({
  type,
  weightKg,
  reps,
});

describe("prefillRow", () => {
  const last = [s(40, 10, "warmup"), s(80, 8), s(80, 7), s(80, 6)];

  it("uses the same set position from last session", () => {
    expect(prefillRow(0, [], last, 6)).toEqual({ weightKg: 40, reps: 10, type: "warmup" });
    expect(prefillRow(2, [s(40, 10, "warmup"), s(80, 8)], last, 6)).toEqual({
      weightKg: 80,
      reps: 7,
      type: "working",
    });
  });

  it("falls back to last session's final set for extra rows", () => {
    expect(prefillRow(6, [], last, 6)).toEqual({ weightKg: 80, reps: 6, type: "working" });
  });

  it("carries today's adjusted weight forward", () => {
    // Lifter went up to 82.5 on set 2 — set 3 should follow, keeping last time's reps.
    expect(prefillRow(2, [s(40, 10, "warmup"), s(82.5, 8)], last, 6)).toEqual({
      weightKg: 82.5,
      reps: 7,
      type: "working",
    });
  });

  it("copies the previous set logged today when there is no history", () => {
    expect(prefillRow(1, [s(30, 12)], null, 8)).toEqual({
      weightKg: 30,
      reps: 12,
      type: "working",
    });
    expect(prefillRow(1, [s(20, 10, "warmup")], null, 8)).toEqual({
      weightKg: 20,
      reps: 10,
      type: "working",
    });
  });

  it("starts empty with the bottom of the rep range", () => {
    expect(prefillRow(0, [], null, 8)).toEqual({ weightKg: null, reps: 8, type: "working" });
    expect(prefillRow(0, [], [], 0)).toEqual({ weightKg: null, reps: null, type: "working" });
  });
});
