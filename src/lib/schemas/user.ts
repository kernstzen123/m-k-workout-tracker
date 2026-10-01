import { z } from "zod";
import { millis } from "./common";

export const userProfileSchema = z.object({
  name: z.string().trim().min(1).max(50),
  defaultRestSec: z.int().min(0).max(900),
  shareCompare: z.boolean().default(true),
  createdAt: millis,
});
export type UserProfile = z.infer<typeof userProfileSchema>;
