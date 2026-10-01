import { z } from "zod";
import { MUSCLES, dayString, millis } from "./common";

/** `users/{uid}/prs/{exerciseId}` — personal records for one exercise. */
export const prDocSchema = z.object({
  bestWeight: z.number().min(0).max(1000),
  /** Reps achieved at `bestWeight`. */
  bestReps: z.int().min(0).max(1000),
  bestE1RM: z.number().min(0).max(5000),
  bestVolume: z.number().min(0).max(1_000_000),
  /** Most reps ever done at each weight (kg as string key), bounded to the heaviest 40. */
  repsAtWeight: z.record(z.string(), z.int().min(0).max(1000)),
  dates: z.object({
    weight: dayString.optional(),
    reps: dayString.optional(),
    e1rm: dayString.optional(),
    volume: dayString.optional(),
  }),
  updatedAt: millis,
});
export type PrDoc = z.infer<typeof prDocSchema>;

const muscleStat = z.object({ sets: z.number().min(0), volume: z.number().min(0) });

/** `users/{uid}/weeklyStats/{yyyy-Www}` — written with increments when a session is finished. */
export const weeklyStatsDocSchema = z.object({
  sessions: z.number().min(0).optional(),
  muscles: z.partialRecord(z.enum(MUSCLES), muscleStat).optional(),
  updatedAt: millis.optional(),
});
export type WeeklyStatsDoc = z.infer<typeof weeklyStatsDocSchema>;
export type WeeklyStats = WeeklyStatsDoc & { id: string };
