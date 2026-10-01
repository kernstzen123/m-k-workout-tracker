import { z } from "zod";

export const MUSCLES = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "traps",
  "lower_back",
  "abs",
  "quads",
  "hamstrings",
  "glutes",
  "adductors",
  "calves",
  "full_body",
  "cardio",
] as const;
export type Muscle = (typeof MUSCLES)[number];

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  traps: "Traps",
  lower_back: "Lower back",
  abs: "Abs",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  adductors: "Adductors",
  calves: "Calves",
  full_body: "Full body",
  cardio: "Cardio",
};

/** Lower-body muscles default to 5 kg increments on barbells/machines. */
export const LOWER_BODY: ReadonlySet<Muscle> = new Set([
  "quads",
  "hamstrings",
  "glutes",
  "adductors",
  "calves",
  "lower_back",
]);

export const EQUIPMENT = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "smith_machine",
  "ez_bar",
  "kettlebell",
  "bodyweight",
  "band",
  "cardio_machine",
  "other",
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  machine: "Machine",
  cable: "Cable",
  smith_machine: "Smith machine",
  ez_bar: "EZ bar",
  kettlebell: "Kettlebell",
  bodyweight: "Bodyweight",
  band: "Band",
  cardio_machine: "Cardio machine",
  other: "Other",
};

export const SET_TYPES = ["warmup", "working", "drop", "failure"] as const;
export type SetType = (typeof SET_TYPES)[number];

export const CARDIO_INTENSITIES = ["low", "moderate", "high"] as const;

/** Epoch milliseconds (client clock). */
export const millis = z.int().positive();

/** Local calendar day, `YYYY-MM-DD`. */
export const dayString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const kg = z.number().min(0).max(1000);
