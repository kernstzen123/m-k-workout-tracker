import { describe, expect, it } from "vitest";
import type { Session } from "@/lib/schemas/session";
import { filterSessions } from "./history";

const session = (
  id: string,
  dayId: string,
  dayName: string,
  notes: string,
  exerciseIds: string[],
): Session => ({
  id,
  date: "2026-10-01",
  dayId,
  dayName,
  programVersion: 1,
  exercises: exerciseIds.map((exerciseId, i) => ({
    key: `k${i}`,
    exerciseId,
    targetSets: 3,
    repMin: 6,
    repMax: 8,
  })),
  startedAt: 1,
  durationSec: 3600,
  totalVolume: 1000,
  notes,
  status: "done",
});

const list = [
  session("a", "upper-a", "Upper A", "felt strong", ["barbell-bench-press", "barbell-row"]),
  session("b", "lower-a", "Lower A", "", ["back-squat"]),
];
const names: Record<string, string> = {
  "back-squat": "Back Squat",
  "barbell-bench-press": "Barbell Bench Press",
};
const base = { query: "", dayId: null, exerciseId: null };

describe("filterSessions", () => {
  it("filters by day and by exercise", () => {
    expect(filterSessions(list, { ...base, dayId: "lower-a" }).map((s) => s.id)).toEqual(["b"]);
    expect(filterSessions(list, { ...base, exerciseId: "barbell-row" }).map((s) => s.id)).toEqual([
      "a",
    ]);
  });

  it("searches day name, notes and exercise names", () => {
    expect(filterSessions(list, { ...base, query: "strong" }).map((s) => s.id)).toEqual(["a"]);
    expect(
      filterSessions(list, { ...base, query: "squat" }, (id) => names[id]).map((s) => s.id),
    ).toEqual(["b"]);
  });
});
