import type { ProgramDay, ProgramItem } from "@/lib/schemas/program";

/**
 * Default program: Upper / Lower / Upper / Lower / Full Body.
 * Abs on both lower days; a low-intensity cardio finisher on every upper and lower day.
 * Exercise ids are slugs from the seeded library. Both users can edit this in the app.
 */
const item = (
  exerciseId: string,
  sets: number,
  repMin: number,
  repMax: number,
  supersetGroup?: string,
): ProgramItem => ({
  exerciseId,
  sets,
  repMin,
  repMax,
  ...(supersetGroup ? { supersetGroup } : {}),
});

const cardio = (exerciseId: string, durationMin: number): ProgramItem => ({
  exerciseId,
  sets: 1,
  repMin: 0,
  repMax: 0,
  durationMin,
});

export const DEFAULT_PROGRAM_NAME = "Upper / Lower + Full Body";

export const DEFAULT_PROGRAM_DAYS: ProgramDay[] = [
  {
    dayId: "upper-a",
    name: "Upper A",
    items: [
      item("barbell-bench-press", 4, 6, 8),
      item("barbell-row", 4, 6, 8),
      item("overhead-press", 3, 6, 8),
      item("lat-pulldown", 3, 8, 12),
      item("ez-bar-curl", 3, 10, 12, "A"),
      item("rope-pushdown", 3, 10, 12, "A"),
      cardio("incline-treadmill-walk", 15),
    ],
  },
  {
    dayId: "lower-a",
    name: "Lower A",
    items: [
      item("back-squat", 4, 5, 8),
      item("romanian-deadlift", 3, 6, 10),
      item("leg-press", 3, 10, 15),
      item("lying-leg-curl", 3, 10, 15),
      item("standing-calf-raise", 4, 10, 15),
      item("cable-crunch", 3, 10, 15, "A"),
      item("hanging-leg-raise", 3, 8, 15, "A"),
      cardio("incline-treadmill-walk", 15),
    ],
  },
  {
    dayId: "upper-b",
    name: "Upper B",
    items: [
      item("incline-dumbbell-press", 3, 8, 12),
      item("pull-up", 3, 6, 10),
      item("seated-cable-row", 3, 8, 12),
      item("machine-shoulder-press", 3, 8, 12),
      item("dumbbell-lateral-raise", 3, 12, 20, "A"),
      item("face-pull", 3, 12, 20, "A"),
      item("hammer-curl", 3, 8, 12, "B"),
      item("overhead-cable-extension", 3, 10, 15, "B"),
      cardio("incline-treadmill-walk", 15),
    ],
  },
  {
    dayId: "lower-b",
    name: "Lower B",
    items: [
      item("deadlift", 3, 3, 6),
      item("bulgarian-split-squat", 3, 8, 12),
      item("barbell-hip-thrust", 3, 8, 12),
      item("leg-extension", 3, 10, 15),
      item("seated-leg-curl", 3, 10, 15),
      item("seated-calf-raise", 3, 10, 20),
      item("ab-wheel-rollout", 3, 6, 15, "A"),
      item("plank-seconds", 3, 30, 90, "A"),
      cardio("incline-treadmill-walk", 15),
    ],
  },
  {
    dayId: "full-body",
    name: "Full Body",
    items: [
      item("dumbbell-bench-press", 3, 8, 12),
      item("chest-supported-dumbbell-row", 3, 8, 12),
      item("hack-squat", 3, 8, 12),
      item("dumbbell-romanian-deadlift", 3, 8, 12),
      item("cable-lateral-raise", 3, 12, 20),
      item("dumbbell-curl", 3, 8, 12, "A"),
      item("triceps-pushdown", 3, 10, 15, "A"),
    ],
  },
];
