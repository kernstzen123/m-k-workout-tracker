import type { ProgramDay } from "@/lib/schemas/program";

/**
 * The program day to suggest next: the one after the last completed day, wrapping around.
 * Unknown/removed last day (or no history) → the first day.
 */
export function nextDay(days: readonly ProgramDay[], lastDayId: string | null): ProgramDay | null {
  if (days.length === 0) return null;
  const index = lastDayId ? days.findIndex((d) => d.dayId === lastDayId) : -1;
  return days[(index + 1) % days.length] ?? null;
}
