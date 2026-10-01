import { describe, expect, it } from "vitest";
import type { SetSnapshot } from "@/lib/schemas/session";
import { bandStatus, mergeTallies, tallyMuscles } from "./volume";

const w = (weightKg: number, reps: number, type: SetSnapshot["type"] = "working"): SetSnapshot => ({
  type,
  weightKg,
  reps,
});

describe("tallyMuscles", () => {
  it("credits the primary muscle fully and secondaries at half, ignoring warm-ups", () => {
    const t = tallyMuscles([w(40, 10, "warmup"), w(80, 8), w(80, 8)], "chest", [
      "triceps",
      "shoulders",
    ]);
    expect(t).toEqual({
      chest: { sets: 2, volume: 1280 },
      triceps: { sets: 1, volume: 640 },
      shoulders: { sets: 1, volume: 640 },
    });
  });

  it("ignores cardio and empty sets", () => {
    expect(tallyMuscles([w(0, 0)], "chest", [])).toEqual({});
    expect(tallyMuscles([w(0, 20)], "cardio", [])).toEqual({});
  });
});

describe("mergeTallies", () => {
  it("sums per muscle", () => {
    expect(
      mergeTallies(
        { chest: { sets: 3, volume: 100 } },
        { chest: { sets: 1.5, volume: 50 }, back: { sets: 2, volume: 10 } },
      ),
    ).toEqual({ chest: { sets: 4.5, volume: 150 }, back: { sets: 2, volume: 10 } });
  });
});

describe("bandStatus", () => {
  it("classifies against the target band", () => {
    expect(bandStatus("chest", 6)).toBe("below");
    expect(bandStatus("chest", 12)).toBe("within");
    expect(bandStatus("chest", 24)).toBe("above");
    expect(bandStatus("cardio", 3)).toBe("none");
  });
});
