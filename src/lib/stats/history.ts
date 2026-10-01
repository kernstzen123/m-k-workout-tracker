import type { Session } from "@/lib/schemas/session";

export interface HistoryFilter {
  query: string;
  dayId: string | null;
  exerciseId: string | null;
}

/**
 * Client-side filter over loaded history pages. Exercise filtering uses each session's slot
 * snapshot, so it costs no extra reads.
 */
export function filterSessions(
  sessions: readonly Session[],
  f: HistoryFilter,
  exerciseName: (id: string) => string | undefined = () => undefined,
): Session[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  return sessions.filter((s) => {
    if (f.dayId && s.dayId !== f.dayId) return false;
    const ids = (s.exercises ?? []).map((e) => e.exerciseId);
    if (f.exerciseId && !ids.includes(f.exerciseId)) return false;
    if (words.length === 0) return true;
    const haystack = [s.dayName ?? "", s.notes, s.date, ...ids.map((id) => exerciseName(id) ?? id)]
      .join(" ")
      .toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}
