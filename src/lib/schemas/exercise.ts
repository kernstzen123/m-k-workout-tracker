import { z } from "zod";
import { EQUIPMENT, MUSCLES, millis } from "./common";

/** Fields a user edits in the exercise form. */
export const exerciseInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80),
    muscle: z.enum(MUSCLES),
    secondary: z.array(z.enum(MUSCLES)).max(6),
    equipment: z.enum(EQUIPMENT),
    type: z.enum(["strength", "cardio"]),
    repMin: z.int().min(0).max(100),
    repMax: z.int().min(0).max(100),
    restSec: z.int().min(0).max(900),
    incrementKg: z.number().min(0).max(50),
  })
  .refine((e) => e.repMin <= e.repMax, {
    message: "Min reps must be ≤ max reps",
    path: ["repMax"],
  });
export type ExerciseInput = z.infer<typeof exerciseInputSchema>;

/** Stored document shape (`exercises/{id}`). */
export const exerciseDocSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    muscle: z.enum(MUSCLES),
    secondary: z.array(z.enum(MUSCLES)).max(6),
    equipment: z.enum(EQUIPMENT),
    type: z.enum(["strength", "cardio"]),
    repMin: z.int().min(0).max(100),
    repMax: z.int().min(0).max(100),
    restSec: z.int().min(0).max(900),
    incrementKg: z.number().min(0).max(50),
    archived: z.boolean(),
    createdAt: millis,
    updatedAt: millis,
  })
  .refine((e) => e.repMin <= e.repMax, { message: "repMin must be ≤ repMax", path: ["repMax"] });
export type ExerciseDoc = z.infer<typeof exerciseDocSchema>;

export type Exercise = ExerciseDoc & { id: string };
