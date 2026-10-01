import { describe, expect, it } from "vitest";
import type { ProgramDay } from "@/lib/schemas/program";
import type { SessionDoc, SessionExercise, WorkoutSet } from "@/lib/schemas/session";
import { buildFinish, restsAfterSet, setsForSlot, slotsFromDay } from "./session";

const slot = (key: string, exerciseId: string, supersetGroup?: string): SessionExercise => ({
  key,
  exerciseId,
  targetSets: 3,
  repMin: 6,
  repMax: 10,
  ...(supersetGroup ? { supersetGroup } : {}),
});

const set = (
  id: string,
  exerciseId: string,
  order: number,
  weightKg: number,
  reps: number,
  slotKey?: string,
  type: WorkoutSet["type"] = "working",
): WorkoutSet => ({ id, exerciseId, order, weightKg, reps, type, ...(slotKey ? { slotKey } : {}) });

describe("slotsFromDay", () => {
  it("snapshots program items into session slots", () => {
    let n = 0;
    const day: ProgramDay = {
      dayId: "upper-a",
      name: "Upper A",
      items: [
        { exerciseId: "bench", sets: 4, repMin: 6, repMax: 8, supersetGroup: "A" },
        { exerciseId: "walk", sets: 1, repMin: 0, repMax: 0, durationMin: 15 },
      ],
    };
    expect(slotsFromDay(day, () => `k${n++}`)).toEqual([
      { key: "k0", exerciseId: "bench", targetSets: 4, repMin: 6, repMax: 8, supersetGroup: "A" },
      { key: "k1", exerciseId: "walk", targetSets: 1, repMin: 0, repMax: 0, durationMin: 15 },
    ]);
  });
});

describe("setsForSlot", () => {
  const slots = [slot("a", "bench"), slot("b", "row"), slot("c", "bench")];

  it("matches by slot key and sorts by order", () => {
    const sets = [
      set("2", "bench", 1, 60, 8, "a"),
      set("1", "bench", 0, 60, 8, "a"),
      set("3", "bench", 0, 50, 10, "c"),
    ];
    expect(setsForSlot(sets, slots[0]!, slots).map((s) => s.id)).toEqual(["1", "2"]);
    expect(setsForSlot(sets, slots[2]!, slots).map((s) => s.id)).toEqual(["3"]);
  });

  it("assigns legacy sets without a slot key to the first slot of the exercise", () => {
    const sets = [set("x", "bench", 0, 60, 8)];
    expect(setsForSlot(sets, slots[0]!, slots)).toHaveLength(1);
    expect(setsForSlot(sets, slots[2]!, slots)).toHaveLength(0);
  });
});

describe("restsAfterSet", () => {
  const slots = [
    slot("a", "bench"),
    slot("b", "curl", "A"),
    slot("c", "pushdown", "A"),
    slot("d", "fly"),
  ];

  it("rests after normal exercises and after the last exercise of a superset", () => {
    expect(restsAfterSet(slots, "a")).toBe(true);
    expect(restsAfterSet(slots, "b")).toBe(false);
    expect(restsAfterSet(slots, "c")).toBe(true);
  });
});

describe("buildFinish", () => {
  const session: SessionDoc = {
    date: "2026-10-01",
    dayId: "upper-a",
    programVersion: 3,
    exercises: [slot("a", "bench"), slot("b", "row")],
    startedAt: 1_000_000,
    durationSec: 0,
    totalVolume: 0,
    notes: "",
    status: "draft",
  };
  const sets = [
    set("1", "bench", 0, 40, 10, "a", "warmup"),
    set("2", "bench", 1, 80, 8, "a"),
    set("3", "row", 0, 70, 10, "b"),
  ];

  const info = {
    bench: { muscle: "chest", secondary: ["triceps"] },
    row: { muscle: "back", secondary: [] },
  } as const;
  const input = (over: Partial<Parameters<typeof buildFinish>[0]> = {}) => ({
    sessionId: "s1",
    session,
    sets,
    previousLastSets: {},
    previousPrs: {},
    exerciseInfo: (id: string) => info[id as keyof typeof info],
    notes: "",
    now: 2_000_000,
    ...over,
  });

  it("marks the session done with duration, volume and notes", () => {
    const { session: done } = buildFinish(
      input({ notes: "  felt strong ", now: 1_000_000 + 3_600_000 }),
    );
    expect(done.status).toBe("done");
    expect(done.durationSec).toBe(3600);
    expect(done.totalVolume).toBe(80 * 8 + 70 * 10);
    expect(done.notes).toBe("felt strong");
    expect(done.programVersion).toBe(3);
    expect(done.setCount).toBe(2);
    expect(done.prCount).toBe(0);
  });

  it("detects PRs against previous records and flags the PR sets", () => {
    const first = buildFinish(input());
    const again = buildFinish(
      input({
        sessionId: "s2",
        sets: [set("4", "bench", 0, 85, 6, "a"), set("5", "row", 0, 70, 10, "b")],
        previousPrs: first.prs,
      }),
    );
    expect(first.prHits).toEqual([]); // baseline session
    expect(again.prHits.map((p) => [p.exerciseId, p.hit.kind])).toEqual([
      ["bench", "weight"],
      ["bench", "e1rm"],
    ]);
    expect(again.prSetIds).toEqual(["4"]);
    expect(again.session.prCount).toBe(2);
  });

  it("tallies weekly volume per muscle (secondary at half credit)", () => {
    const { weekly, weekId } = buildFinish(input());
    expect(weekId).toMatch(/^\d{4}-W\d{2}$/);
    expect(weekly).toEqual({
      chest: { sets: 1, volume: 640 },
      triceps: { sets: 0.5, volume: 320 },
      back: { sets: 1, volume: 700 },
    });
  });

  it("builds lastSets only for exercises with logged sets", () => {
    const { lastSets } = buildFinish(input());
    expect(Object.keys(lastSets).sort()).toEqual(["bench", "row"]);
    expect(lastSets.bench?.sets.map((s) => s.weightKg)).toEqual([40, 80]);
    expect(lastSets.bench?.history.at(-1)?.topWeightKg).toBe(80);
  });
});
