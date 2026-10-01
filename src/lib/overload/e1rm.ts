/**
 * Estimated one-rep max (Epley): weight × (1 + reps / 30). A single is its own 1RM.
 * Returns 0 for empty sets; rounded to 0.1 kg.
 */
export function e1rm(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  const value = reps === 1 ? weightKg : weightKg * (1 + reps / 30);
  return Math.round(value * 10) / 10;
}
