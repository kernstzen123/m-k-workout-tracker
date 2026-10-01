import { describe, expect, it } from "vitest";
import { exerciseInputSchema } from "@/lib/schemas/exercise";
import { SEED_EXERCISES } from "./exercises";

describe("seed exercises", () => {
  it("has roughly 150 exercises", () => {
    expect(SEED_EXERCISES.length).toBeGreaterThanOrEqual(140);
  });

  it("every exercise passes schema validation", () => {
    for (const { id: _id, ...ex } of SEED_EXERCISES) {
      const result = exerciseInputSchema.safeParse(ex);
      expect(result.success, `${ex.name}: ${result.error?.message}`).toBe(true);
    }
  });

  it("has unique ids and names", () => {
    const ids = SEED_EXERCISES.map((e) => e.id);
    const names = SEED_EXERCISES.map((e) => e.name.toLowerCase());
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it("uses 2.5 kg upper-body and 5 kg lower-body barbell increments", () => {
    const byId = new Map(SEED_EXERCISES.map((e) => [e.id, e]));
    expect(byId.get("barbell-bench-press")?.incrementKg).toBe(2.5);
    expect(byId.get("back-squat")?.incrementKg).toBe(5);
    expect(byId.get("romanian-deadlift")?.incrementKg).toBe(5);
    expect(byId.get("deadlift")?.incrementKg).toBe(5);
  });

  it("includes cardio finishers and ab work", () => {
    expect(SEED_EXERCISES.filter((e) => e.type === "cardio").length).toBeGreaterThanOrEqual(5);
    expect(SEED_EXERCISES.filter((e) => e.muscle === "abs").length).toBeGreaterThanOrEqual(10);
  });
});
