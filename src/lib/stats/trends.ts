import { addDays, differenceInCalendarDays, parseISO, startOfISOWeek, subWeeks } from "date-fns";
import { isoWeekId, toDayString } from "@/lib/dates";

export interface DatedValue {
  date: string; // YYYY-MM-DD
  value: number;
}

/**
 * Trailing 7-day moving average: for each entry, the mean of all entries dated within the
 * previous 7 calendar days (inclusive). Robust to missed days and multiple weigh-ins per day.
 * Input in any order; output sorted oldest → newest.
 */
export function movingAverage(
  entries: readonly DatedValue[],
  windowDays = 7,
): Array<DatedValue & { avg: number }> {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((e) => {
    const end = parseISO(e.date);
    const inWindow = sorted.filter((o) => {
      const diff = differenceInCalendarDays(end, parseISO(o.date));
      return diff >= 0 && diff < windowDays;
    });
    const avg = inWindow.reduce((s, o) => s + o.value, 0) / inWindow.length;
    return { ...e, avg: Math.round(avg * 10) / 10 };
  });
}

export interface WeekBucket {
  weekId: string;
  /** Monday of the week, YYYY-MM-DD. */
  start: string;
  label: string;
}

/** The last `count` ISO weeks ending with the week containing `now`, oldest first. */
export function lastWeeks(count: number, now: Date | number = new Date()): WeekBucket[] {
  const thisWeek = startOfISOWeek(now);
  return Array.from({ length: count }, (_, i) => {
    const start = subWeeks(thisWeek, count - 1 - i);
    return {
      weekId: isoWeekId(start),
      start: toDayString(start),
      label: `${start.getDate()} ${start.toLocaleString("en-GB", { month: "short" })}`,
    };
  });
}

export interface CardioLike {
  date: string;
  durationMin: number;
  distanceKm?: number | null;
}

export interface CardioWeek extends WeekBucket {
  minutes: number;
  distanceKm: number;
  entries: number;
}

/** Weekly cardio totals for the last `weeks` weeks (weeks without cardio are zero). */
export function weeklyCardioTotals(
  entries: readonly CardioLike[],
  weeks: number,
  now: Date | number = new Date(),
): CardioWeek[] {
  const buckets = lastWeeks(weeks, now).map((b) => ({
    ...b,
    minutes: 0,
    distanceKm: 0,
    entries: 0,
  }));
  const byId = new Map(buckets.map((b) => [b.weekId, b]));
  for (const e of entries) {
    const b = byId.get(isoWeekId(parseISO(e.date)));
    if (!b) continue;
    b.minutes += e.durationMin;
    b.distanceKm = Math.round((b.distanceKm + (e.distanceKm ?? 0)) * 100) / 100;
    b.entries += 1;
  }
  return buckets;
}

export interface SessionLike {
  startedAt: number;
  durationSec: number;
  avgRestSec?: number | null;
}

export interface Consistency {
  weeks: Array<WeekBucket & { sessions: number }>;
  thisWeek: number;
  /** Consecutive weeks with ≥1 workout, counting back from this week (or last week if this one is empty so far). */
  streakWeeks: number;
  avgPerWeek: number;
  avgDurationSec: number | null;
  avgRestSec: number | null;
}

export function consistency(
  sessions: readonly SessionLike[],
  weeks = 12,
  now: Date | number = new Date(),
): Consistency {
  const buckets = lastWeeks(weeks, now).map((b) => ({ ...b, sessions: 0 }));
  const byId = new Map(buckets.map((b) => [b.weekId, b]));
  for (const s of sessions) {
    const b = byId.get(isoWeekId(s.startedAt));
    if (b) b.sessions += 1;
  }

  // Streak: walk back week by week. An empty current week doesn't break it (the week isn't over).
  const counts = new Map<string, number>();
  for (const s of sessions)
    counts.set(isoWeekId(s.startedAt), (counts.get(isoWeekId(s.startedAt)) ?? 0) + 1);
  let streak = 0;
  let cursor = startOfISOWeek(now);
  if (!counts.get(isoWeekId(cursor))) cursor = addDays(cursor, -7);
  while (counts.get(isoWeekId(cursor))) {
    streak++;
    cursor = addDays(cursor, -7);
  }

  const durations = sessions.map((s) => s.durationSec).filter((d) => d > 0);
  const rests = sessions.map((s) => s.avgRestSec).filter((r): r is number => typeof r === "number");
  const mean = (xs: number[]) =>
    xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
  const total = buckets.reduce((s, b) => s + b.sessions, 0);

  return {
    weeks: buckets,
    thisWeek: buckets.at(-1)?.sessions ?? 0,
    streakWeeks: streak,
    avgPerWeek: Math.round((total / weeks) * 10) / 10,
    avgDurationSec: mean(durations),
    avgRestSec: mean(rests),
  };
}
