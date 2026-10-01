import { describe, expect, it } from "vitest";
import type { Session, WorkoutSet } from "@/lib/schemas/session";
import { parseWorkoutsCsv, workoutsToCsv } from "./workouts";

const exercises = [
  { id: "back-squat", name: "Back Squat" },
  { id: "barbell-bench-press", name: "Barbell Bench Press" },
];

describe("parseWorkoutsCsv", () => {
  it("groups rows into sessions by date + workout and validates sets", () => {
    const csv = [
      "date,workout,exercise,set_type,weight_kg,reps,rpe",
      "2026-01-05,Lower A,Back Squat,warmup,60,5,",
      "2026-01-05,Lower A,back squat,,100,5,8",
      "2026-01-07,Upper A,Barbell Bench Press,working,80,8,",
    ].join("\n");
    const out = parseWorkoutsCsv(csv, exercises);
    expect(out.errors).toEqual([]);
    expect(out.setCount).toBe(3);
    expect(out.sessions.map((s) => [s.date, s.dayName, s.sets.length])).toEqual([
      ["2026-01-05", "Lower A", 2],
      ["2026-01-07", "Upper A", 1],
    ]);
    expect(out.sessions[0]!.sets[1]).toMatchObject({
      exerciseId: "back-squat",
      type: "working",
      weightKg: 100,
      rpe: 8,
    });
    expect(out.sessions[0]!.id).toMatch(/^imp-/);
  });

  it("accepts a Strong-style export (aliases, durations, notes)", () => {
    const csv = [
      "Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Notes,Workout Notes,RPE",
      "2025-11-02 18:05:00,Push,1h 5m,Barbell Bench Press,1,80,8,paused,good day,7.5",
    ].join("\n");
    const out = parseWorkoutsCsv(csv, exercises);
    expect(out.errors).toEqual([]);
    expect(out.sessions[0]).toMatchObject({
      dayName: "Push",
      durationSec: 3900,
      notes: "good day",
    });
    expect(out.sessions[0]!.sets[0]).toMatchObject({ note: "paused", rpe: 7.5 });
  });

  it("reports invalid rows with line numbers and keeps the valid ones", () => {
    const csv = [
      "date,exercise,weight_kg,reps",
      "2026-01-05,Back Squat,100,5",
      "05/01/2026,Back Squat,100,5",
      "2026-01-05,Moon Squat,100,5",
      "2026-01-05,Back Squat,100,0",
      "2026-01-05,Back Squat,-5,5",
    ].join("\n");
    const out = parseWorkoutsCsv(csv, exercises);
    expect(out.setCount).toBe(1);
    expect(out.errors.map((e) => e.line)).toEqual([3, 4, 5, 6]);
    expect(out.errors[1]!.message).toContain("Unknown exercise");
  });

  it("rejects files without required columns or in lbs", () => {
    expect(
      parseWorkoutsCsv("date,exercise\n2026-01-01,Back Squat", exercises).errors[0]!.message,
    ).toContain("reps");
    expect(
      parseWorkoutsCsv("date,exercise,reps,weight (lbs)\n2026-01-01,Back Squat,5,225", exercises)
        .errors[0]!.message,
    ).toContain("lbs");
  });

  it("produces stable ids so re-importing the same file is idempotent", () => {
    const csv = "date,workout,exercise,weight_kg,reps\n2026-01-05,Lower A,Back Squat,100,5";
    expect(parseWorkoutsCsv(csv, exercises).sessions[0]!.id).toBe(
      parseWorkoutsCsv(csv, exercises).sessions[0]!.id,
    );
  });
});

describe("workoutsToCsv → parseWorkoutsCsv round trip", () => {
  it("exports one row per set and re-imports the same data", () => {
    const session: Session = {
      id: "s1",
      date: "2026-02-01",
      dayId: "upper-a",
      dayName: "Upper A",
      programVersion: 1,
      exercises: [
        { key: "k1", exerciseId: "barbell-bench-press", targetSets: 2, repMin: 6, repMax: 8 },
      ],
      startedAt: Date.UTC(2026, 1, 1, 17),
      durationSec: 3600,
      totalVolume: 1280,
      notes: "felt good",
      status: "done",
    };
    const sets: WorkoutSet[] = [
      {
        id: "a",
        exerciseId: "barbell-bench-press",
        slotKey: "k1",
        order: 0,
        type: "working",
        weightKg: 80,
        reps: 8,
      },
      {
        id: "b",
        exerciseId: "barbell-bench-press",
        slotKey: "k1",
        order: 1,
        type: "working",
        weightKg: 80,
        reps: 8,
        isPR: true,
      },
    ];
    const csv = workoutsToCsv(
      [session],
      new Map([["s1", sets]]),
      (id) => exercises.find((e) => e.id === id)!.name,
    );
    expect(csv.split("\r\n")).toHaveLength(3);
    const back = parseWorkoutsCsv(csv, exercises);
    expect(back.errors).toEqual([]);
    expect(back.sessions[0]).toMatchObject({
      date: "2026-02-01",
      dayName: "Upper A",
      durationSec: 3600,
      notes: "felt good",
    });
    expect(back.sessions[0]!.sets.map((s) => [s.weightKg, s.reps])).toEqual([
      [80, 8],
      [80, 8],
    ]);
  });
});
