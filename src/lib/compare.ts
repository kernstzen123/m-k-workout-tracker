import type { SessionSummary } from "@/lib/schemas/session";
import type { PrDoc } from "@/lib/schemas/stats";

/** The lifts shown first on the Compare screen (when either of you has done them). */
export const KEY_LIFTS = [
  "back-squat",
  "barbell-bench-press",
  "deadlift",
  "overhead-press",
  "barbell-row",
  "pull-up",
  "romanian-deadlift",
  "barbell-hip-thrust",
] as const;

export type CompareMetric = "e1rm" | "weight" | "volume";

export interface CompareRow {
  exerciseId: string;
  mine: number | null;
  theirs: number | null;
  /** e.g. "100 kg × 5" for the heaviest-weight metric. */
  mineDetail: string | null;
  theirsDetail: string | null;
}

function pick(
  pr: PrDoc | undefined,
  metric: CompareMetric,
): { value: number; detail: string } | null {
  if (!pr) return null;
  switch (metric) {
    case "e1rm":
      return pr.bestE1RM > 0 ? { value: pr.bestE1RM, detail: `${pr.bestE1RM} kg` } : null;
    case "weight":
      return pr.bestWeight > 0
        ? { value: pr.bestWeight, detail: `${pr.bestWeight} kg × ${pr.bestReps}` }
        : null;
    case "volume":
      return pr.bestVolume > 0
        ? { value: pr.bestVolume, detail: `${pr.bestVolume.toLocaleString()} kg` }
        : null;
  }
}

/**
 * Side-by-side rows: key lifts first (in KEY_LIFTS order, when either of you has a record), then
 * every other exercise you've *both* done, strongest first. Capped at `max` rows.
 */
export function buildComparison(
  mine: Readonly<Record<string, PrDoc>>,
  theirs: Readonly<Record<string, PrDoc>>,
  metric: CompareMetric,
  max = 20,
): CompareRow[] {
  const row = (id: string): CompareRow | null => {
    const a = pick(mine[id], metric);
    const b = pick(theirs[id], metric);
    if (!a && !b) return null;
    return {
      exerciseId: id,
      mine: a?.value ?? null,
      theirs: b?.value ?? null,
      mineDetail: a?.detail ?? null,
      theirsDetail: b?.detail ?? null,
    };
  };
  const key = KEY_LIFTS.map(row).filter((r): r is CompareRow => r !== null);
  const keySet = new Set<string>(KEY_LIFTS);
  const shared = Object.keys(mine)
    .filter((id) => !keySet.has(id) && theirs[id])
    .map(row)
    .filter((r): r is CompareRow => r !== null && r.mine !== null && r.theirs !== null)
    .sort((a, b) => Math.max(b.mine!, b.theirs!) - Math.max(a.mine!, a.theirs!));
  return [...key, ...shared].slice(0, max);
}

export interface TrendPoint {
  date: string;
  mine?: number;
  theirs?: number;
}

/** Merge two e1RM histories into one date-ordered series (best value per person per day). */
export function mergeTrend(
  mine: readonly SessionSummary[] | undefined,
  theirs: readonly SessionSummary[] | undefined,
): TrendPoint[] {
  const byDate = new Map<string, TrendPoint>();
  const add = (list: readonly SessionSummary[] | undefined, key: "mine" | "theirs") => {
    for (const h of list ?? []) {
      const p = byDate.get(h.date) ?? { date: h.date };
      p[key] = Math.max(p[key] ?? 0, h.e1rm);
      byDate.set(h.date, p);
    }
  };
  add(mine, "mine");
  add(theirs, "theirs");
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
