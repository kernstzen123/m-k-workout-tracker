import { mergeTallies, type MuscleTally } from "@/lib/overload/volume";
import type { Muscle } from "@/lib/schemas/common";
import type { WeeklyStatsDoc } from "@/lib/schemas/stats";

export interface WeekTotals {
  sessions: number;
  muscles: Partial<Record<Muscle, MuscleTally>>;
}

/** Sum a week's per-session entries (plus any legacy increment totals). */
export function weekTotals(doc: WeeklyStatsDoc | undefined): WeekTotals {
  if (!doc) return { sessions: 0, muscles: {} };
  const entries = Object.values(doc.bySession ?? {});
  return {
    sessions: (doc.sessions ?? 0) + entries.length,
    muscles: mergeTallies(doc.muscles ?? {}, ...entries.map((e) => e.muscles)),
  };
}
