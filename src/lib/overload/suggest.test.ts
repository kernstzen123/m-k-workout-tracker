import { describe, expect, it } from "vitest";
import type { SessionSummary, SetSnapshot } from "@/lib/schemas/session";
import { isStalled, roundToStep, suggest } from "./suggest";

const w = (weightKg: number, reps: number, rpe?: number): SetSnapshot => ({
  type: "working",
  weightKg,
  reps,
  ...(rpe !== undefined ? { rpe } : {}),
});
const warm = (weightKg: number, reps: number): SetSnapshot => ({ type: "warmup", weightKg, reps });
const base = { repMin: 6, repMax: 8, incrementKg: 2.5 };
const h = (e1rm: number, volume: number): SessionSummary => ({
  sessionId: `s${e1rm}${volume}`,
  date: "2026-10-01",
  topWeightKg: 80,
  topReps: 8,
  e1rm,
  volume,
});

describe("suggest", () => {
  it("returns nothing without history", () => {
    expect(suggest({ ...base, lastSets: [] })).toEqual([]);
    expect(suggest({ ...base, lastSets: [warm(40, 10)] })).toEqual([]);
  });

  it("adds the increment when every working set hits the top of the range at RPE ≤ 8", () => {
    const [s] = suggest({ ...base, lastSets: [warm(40, 10), w(80, 8, 8), w(80, 8, 7), w(80, 9)] });
    expect(s).toMatchObject({ kind: "increase-weight", weightKg: 82.5, reps: 6 });
  });

  it("does not increase when any top-range set was harder than RPE 8", () => {
    const [s] = suggest({ ...base, lastSets: [w(80, 8, 8), w(80, 8, 9)] });
    expect(s).toMatchObject({ kind: "add-rep", weightKg: 80, reps: 9 });
  });

  it("suggests +1 rep on the weakest set when within the range", () => {
    const lastSets = [warm(40, 10), w(80, 8), w(80, 7), w(80, 6)];
    const [s] = suggest({ ...base, lastSets });
    expect(s).toMatchObject({ kind: "add-rep", setIndex: 3, weightKg: 80, reps: 7 });
  });

  it("suggests repeating the weight when below the bottom of the range", () => {
    const [s] = suggest({ ...base, lastSets: [w(80, 7), w(80, 5)] });
    expect(s).toMatchObject({ kind: "repeat", weightKg: 80 });
  });

  it("uses the heaviest working weight and rounds to the increment", () => {
    const [s] = suggest({ ...base, incrementKg: 5, lastSets: [w(100, 8), w(102.5, 8)] });
    expect(s).toMatchObject({ kind: "increase-weight", weightKg: 107.5 });
  });

  it("never suggests a weight increase for bodyweight work (no increment)", () => {
    const [s] = suggest({ ...base, incrementKg: 0, lastSets: [w(0, 8), w(0, 8)] });
    expect(s?.kind).toBe("add-rep");
  });

  it("adds a deload (−10%) and a variation when stalled for 3 sessions", () => {
    const out = suggest({
      ...base,
      lastSets: [w(100, 7), w(100, 6)],
      history: [h(120, 1500), h(119, 1450), h(118, 1500)],
    });
    expect(out.map((s) => s.kind)).toEqual(["add-rep", "deload", "variation"]);
    expect(out[1]).toMatchObject({ weightKg: 90 });
  });
});

describe("isStalled", () => {
  it("needs 3 sessions", () => {
    expect(isStalled([h(100, 1000), h(99, 1000)])).toBe(false);
  });

  it("is false when e1RM or volume improved in a later session", () => {
    expect(isStalled([h(100, 1000), h(101, 900), h(99, 900)])).toBe(false);
    expect(isStalled([h(100, 1000), h(99, 1100), h(99, 900)])).toBe(false);
  });

  it("only looks at the latest 3 sessions", () => {
    expect(isStalled([h(90, 800), h(100, 1000), h(100, 1000), h(98, 990)])).toBe(true);
  });
});

describe("roundToStep", () => {
  it("rounds to the increment", () => {
    expect(roundToStep(82.4, 2.5)).toBe(82.5);
    expect(roundToStep(91.8, 2.5, "down")).toBe(90);
    expect(roundToStep(43.2, 2, "down")).toBe(42);
    expect(roundToStep(10.3, 0)).toBe(10.5);
  });
});
