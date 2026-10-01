import { z } from "zod";
import { CARDIO_INTENSITIES, dayString, millis } from "./common";

export const cardioDocSchema = z.object({
  date: dayString,
  type: z.string().trim().min(1).max(40),
  durationMin: z.number().min(0).max(1440),
  distanceKm: z.number().min(0).max(1000).nullable().optional(),
  avgHr: z.number().min(20).max(250).nullable().optional(),
  intensity: z.enum(CARDIO_INTENSITIES).nullable().optional(),
  sessionId: z.string().max(100).nullable().optional(),
  createdAt: millis.optional(),
});
export type CardioDoc = z.infer<typeof cardioDocSchema>;
export type CardioEntry = CardioDoc & { id: string };

const cm = z.number().min(0).max(300).nullable().optional();

export const tapeSchema = z.object({
  chest: cm,
  waist: cm,
  hips: cm,
  arms: cm,
  thighs: cm,
  calves: cm,
  neck: cm,
});

export const measurementDocSchema = z.object({
  date: dayString,
  weightKg: z.number().min(0).max(500).nullable().optional(),
  bodyFatPct: z.number().min(0).max(100).nullable().optional(),
  tape: tapeSchema.nullable().optional(),
  createdAt: millis.optional(),
  // EXTENSION POINT: progress photos — add `photoIds: string[]` here once a storage backend exists.
});
export type MeasurementDoc = z.infer<typeof measurementDocSchema>;
export type Measurement = MeasurementDoc & { id: string };
