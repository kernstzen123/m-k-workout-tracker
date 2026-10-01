import type { Muscle } from "@/lib/schemas/common";
import type { SetSnapshot } from "@/lib/schemas/session";

/** Secondary muscles get partial credit for a set. */
export const SECONDARY_SET_CREDIT = 0.5;

/**
 * Weekly working-set target bands per muscle (hard sets, secondary work at half credit).
 * Common evidence-based ranges; tweak here if you want different targets.
 */
export const TARGET_BANDS: Partial<Record<Muscle, { min: number; max: number }>> = {
  chest: { min: 10, max: 20 },
  back: { min: 10, max: 20 },
  shoulders: { min: 10, max: 20 },
  quads: { min: 10, max: 20 },
  hamstrings: { min: 8, max: 16 },
  glutes: { min: 8, max: 16 },
  biceps: { min: 8, max: 16 },
  triceps: { min: 8, max: 16 },
  calves: { min: 6, max: 14 },
  abs: { min: 6, max: 14 },
  traps: { min: 4, max: 12 },
  forearms: { min: 2, max: 10 },
  lower_back: { min: 2, max: 8 },
  adductors: { min: 2, max: 8 },
};

export type BandStatus = "below" | "within" | "above" | "none";

export function bandStatus(muscle: Muscle, sets: number): BandStatus {
  const band = TARGET_BANDS[muscle];
  if (!band) return "none";
  if (sets < band.min) return "below";
  if (sets > band.max) return "above";
  return "within";
}

export interface MuscleTally {
  sets: number;
  volume: number;
}

/**
 * Working sets + volume per muscle for one exercise's sets. Warm-ups don't count; primary muscle
 * gets full credit, secondary muscles half (sets and volume).
 */
export function tallyMuscles(
  sets: readonly Pick<SetSnapshot, "type" | "weightKg" | "reps">[],
  muscle: Muscle,
  secondary: readonly Muscle[],
): Partial<Record<Muscle, MuscleTally>> {
  const work = sets.filter((s) => s.type !== "warmup" && s.reps > 0);
  if (work.length === 0 || muscle === "cardio") return {};
  const volume = work.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
  const out: Partial<Record<Muscle, MuscleTally>> = {
    [muscle]: { sets: work.length, volume: round1(volume) },
  };
  for (const m of secondary) {
    if (m === muscle) continue;
    out[m] = {
      sets: work.length * SECONDARY_SET_CREDIT,
      volume: round1(volume * SECONDARY_SET_CREDIT),
    };
  }
  return out;
}

/** Sum several tallies. */
export function mergeTallies(
  ...tallies: Array<Partial<Record<Muscle, MuscleTally>>>
): Partial<Record<Muscle, MuscleTally>> {
  const out: Partial<Record<Muscle, MuscleTally>> = {};
  for (const t of tallies) {
    for (const [m, v] of Object.entries(t) as Array<[Muscle, MuscleTally]>) {
      const cur = out[m] ?? { sets: 0, volume: 0 };
      out[m] = { sets: cur.sets + v.sets, volume: round1(cur.volume + v.volume) };
    }
  }
  return out;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
