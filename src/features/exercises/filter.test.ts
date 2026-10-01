import { describe, expect, it } from "vitest";
import type { Exercise } from "@/lib/schemas/exercise";
import { filterExercises } from "./filter";

const ex = (over: Partial<Exercise>): Exercise => ({
  id: "x",
  name: "X",
  muscle: "chest",
  secondary: [],
  equipment: "barbell",
  type: "strength",
  repMin: 6,
  repMax: 10,
  restSec: 120,
  incrementKg: 2.5,
  archived: false,
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

const list = [
  ex({ id: "bench", name: "Barbell Bench Press", secondary: ["triceps"] }),
  ex({ id: "incline-db", name: "Incline Dumbbell Press", equipment: "dumbbell" }),
  ex({ id: "squat", name: "Back Squat", muscle: "quads" }),
  ex({ id: "old", name: "Old Press", archived: true }),
];

const base = { query: "", muscle: "all" as const, showArchived: false };

describe("filterExercises", () => {
  it("hides archived exercises unless asked", () => {
    expect(filterExercises(list, base).map((e) => e.id)).not.toContain("old");
    expect(filterExercises(list, { ...base, showArchived: true }).map((e) => e.id)).toContain(
      "old",
    );
  });

  it("matches all query words in any order", () => {
    expect(filterExercises(list, { ...base, query: "press dumbbell" }).map((e) => e.id)).toEqual([
      "incline-db",
    ]);
  });

  it("filters by primary or secondary muscle", () => {
    expect(filterExercises(list, { ...base, muscle: "triceps" }).map((e) => e.id)).toEqual([
      "bench",
    ]);
    expect(filterExercises(list, { ...base, muscle: "quads" }).map((e) => e.id)).toEqual(["squat"]);
  });
});
