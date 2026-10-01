import { format, getISOWeek, getISOWeekYear } from "date-fns";

/** Local calendar day as `YYYY-MM-DD`. */
export function toDayString(date: Date | number = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

/** ISO week id, e.g. `2026-W40` (used as the `weeklyStats` doc id). */
export function isoWeekId(date: Date | number = new Date()): string {
  const week = String(getISOWeek(date)).padStart(2, "0");
  return `${getISOWeekYear(date)}-W${week}`;
}
