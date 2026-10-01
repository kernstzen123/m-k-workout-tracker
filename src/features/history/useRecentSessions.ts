import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/features/auth/store";
import { subscribeDoneSince } from "@/lib/data/history";
import { reportError } from "@/lib/monitoring";
import type { Session } from "@/lib/schemas/session";
import { consistency, type Consistency } from "@/lib/stats/trends";

export const CONSISTENCY_WEEKS = 12;

/** Finished sessions from the last 12 weeks (live) + derived consistency stats. */
export function useRecentSessions(): {
  sessions: Session[];
  stats: Consistency;
  loading: boolean;
} {
  const uid = useAuthStore((s) => s.user?.uid);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  // Window start is fixed per mount (12 weeks back, plus a day of slack for week alignment).
  const [since] = useState(() => Date.now() - (CONSISTENCY_WEEKS * 7 + 1) * 86_400_000);

  useEffect(() => {
    if (!uid) return;
    return subscribeDoneSince(uid, since, setSessions, (error) => {
      reportError(error, { where: "subscribeDoneSince" });
      setSessions([]);
    });
  }, [uid, since]);

  const stats = useMemo(() => consistency(sessions ?? [], CONSISTENCY_WEEKS), [sessions]);
  return { sessions: sessions ?? [], stats, loading: sessions === null };
}
