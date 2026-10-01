import { describe, expect, it } from "vitest";
import { programDaySchema } from "@/lib/schemas/program";
import { SEED_EXERCISES } from "@/seed/exercises";
import { DEFAULT_PROGRAM_DAYS } from "./template";

const byId = new Map(SEED_EXERCISES.map((e) => [e.id, e]));

describe("default program template", () => {
  it("is Upper / Lower / Upper / Lower / Full Body", () => {
    expect(DEFAULT_PROGRAM_DAYS.map((d) => d.name)).toEqual([
      "Upper A",
      "Lower A",
      "Upper B",
      "Lower B",
      "Full Body",
    ]);
  });

  it("only references seeded exercises and validates", () => {
    for (const day of DEFAULT_PROGRAM_DAYS) {
      expect(programDaySchema.safeParse(day).success, day.name).toBe(true);
      for (const item of day.items) expect(byId.has(item.exerciseId), item.exerciseId).toBe(true);
    }
  });

  it("has abs on lower days and a cardio finisher on upper/lower days only", () => {
    for (const day of DEFAULT_PROGRAM_DAYS) {
      const muscles = day.items.map((i) => byId.get(i.exerciseId)?.muscle);
      const hasCardio = day.items.some((i) => byId.get(i.exerciseId)?.type === "cardio");
      expect(muscles.includes("abs")).toBe(day.name.startsWith("Lower"));
      expect(hasCardio).toBe(day.name !== "Full Body");
    }
  });

  it("uses each superset group for exactly two adjacent exercises", () => {
    for (const day of DEFAULT_PROGRAM_DAYS) {
      const groups = new Map<string, number[]>();
      day.items.forEach((item, i) => {
        if (item.supersetGroup)
          groups.set(item.supersetGroup, [...(groups.get(item.supersetGroup) ?? []), i]);
      });
      for (const [, idx] of groups) {
        expect(idx).toHaveLength(2);
        expect(idx[1]! - idx[0]!).toBe(1);
      }
    }
  });
});
