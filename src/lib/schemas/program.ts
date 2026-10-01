import { z } from "zod";
import { millis } from "./common";

export const programItemSchema = z
  .object({
    exerciseId: z.string().min(1).max(100),
    sets: z.int().min(1).max(20),
    repMin: z.int().min(0).max(100),
    repMax: z.int().min(0).max(100),
    /** Items sharing a group letter within a day are performed as a superset. */
    supersetGroup: z.string().max(4).optional(),
  })
  .refine((i) => i.repMin <= i.repMax, {
    message: "Min reps must be ≤ max reps",
    path: ["repMax"],
  });
export type ProgramItem = z.infer<typeof programItemSchema>;

export const programDaySchema = z.object({
  dayId: z.string().min(1).max(40),
  name: z.string().trim().min(1).max(40),
  items: z.array(programItemSchema).max(30),
});
export type ProgramDay = z.infer<typeof programDaySchema>;

export const programDocSchema = z.object({
  name: z.string().trim().min(1).max(80),
  days: z.array(programDaySchema).max(7),
  version: z.int().min(1),
  updatedBy: z.string().min(1),
  updatedAt: millis,
});
export type ProgramDoc = z.infer<typeof programDocSchema>;
export type Program = ProgramDoc & { id: string };

export const PROGRAM_ID = "main";
