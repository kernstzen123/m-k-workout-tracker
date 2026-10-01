import { z } from "zod";
import { SET_TYPES, dayString, kg, millis } from "./common";

/** Exercise slot in a session — a snapshot of the program day (or added ad hoc). */
export const sessionExerciseSchema = z.object({
  key: z.string().min(1).max(40), // stable slot id within the session (survives swaps/reorders)
  exerciseId: z.string().min(1).max(100),
  targetSets: z.int().min(0).max(20),
  repMin: z.int().min(0).max(100),
  repMax: z.int().min(0).max(100),
  restSec: z.int().min(0).max(900).optional(),
  supersetGroup: z.string().max(4).optional(),
  /** Cardio slots only: planned minutes. */
  durationMin: z.int().min(1).max(180).optional(),
});
export type SessionExercise = z.infer<typeof sessionExerciseSchema>;

export const sessionDocSchema = z.object({
  date: dayString,
  dayId: z.string().max(40).nullable(),
  dayName: z.string().max(80).optional(),
  programVersion: z.int().nullable(),
  exercises: z.array(sessionExerciseSchema).max(40).optional(),
  startedAt: millis,
  finishedAt: millis.nullable().optional(),
  durationSec: z.int().min(0).max(86_400),
  totalVolume: z.number().min(0).max(10_000_000),
  /** Working sets (no warm-ups); written on finish. */
  setCount: z.int().min(0).max(1000).optional(),
  avgRestSec: z.int().min(0).max(86_400).nullable().optional(),
  prCount: z.int().min(0).max(1000).optional(),
  notes: z.string().max(2000),
  status: z.enum(["draft", "done"]),
  updatedAt: millis.optional(),
});
export type SessionDoc = z.infer<typeof sessionDocSchema>;
export type Session = SessionDoc & { id: string };

export const setDocSchema = z.object({
  exerciseId: z.string().min(1).max(100),
  /** Session slot the set belongs to (`SessionExercise.key`). */
  slotKey: z.string().min(1).max(40).optional(),
  /** Position within its slot, 0-based. */
  order: z.int().min(0).max(10_000),
  type: z.enum(SET_TYPES),
  weightKg: kg,
  reps: z.int().min(0).max(1000),
  rpe: z.number().min(1).max(10).nullable().optional(),
  /** Actual rest taken before this set, in seconds. */
  restSec: z.number().min(0).max(86_400).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  isPR: z.boolean().optional(),
  completedAt: millis.nullable().optional(),
});
export type SetDoc = z.infer<typeof setDocSchema>;
export type WorkoutSet = SetDoc & { id: string };

/** Compact set used for pre-fill and history. */
export const setSnapshotSchema = z.object({
  type: z.enum(SET_TYPES),
  weightKg: kg,
  reps: z.int().min(0).max(1000),
  rpe: z.number().min(1).max(10).nullable().optional(),
});
export type SetSnapshot = z.infer<typeof setSnapshotSchema>;

/** One past session's summary for an exercise (newest last). */
export const sessionSummarySchema = z.object({
  sessionId: z.string().min(1),
  date: dayString,
  topWeightKg: kg,
  topReps: z.int().min(0).max(1000),
  e1rm: z.number().min(0).max(5000),
  volume: z.number().min(0).max(1_000_000),
});
export type SessionSummary = z.infer<typeof sessionSummarySchema>;

/** `users/{uid}/lastSets/{exerciseId}` — denormalised for pre-fill + stall detection. */
export const lastSetsDocSchema = z.object({
  sessionId: z.string().min(1),
  date: dayString,
  sets: z.array(setSnapshotSchema).max(30),
  /** Per-session summaries, oldest first (stall detection + progress charts). */
  history: z.array(sessionSummarySchema).max(400),
  updatedAt: millis,
});
export type LastSetsDoc = z.infer<typeof lastSetsDocSchema>;
