import { useEffect, useState } from "react";
import { useAuthStore } from "@/features/auth/store";
import { useProgramStore } from "@/features/program/store";
import { findLastDoneSession } from "@/lib/data/sessions";
import { reportError } from "@/lib/monitoring";
import type { ProgramDay } from "@/lib/schemas/program";
import { nextDay } from "@/lib/workout/rotation";

/** Suggested program day: the one after the last finished workout's day. */
export function useNextDay(): { day: ProgramDay | null; loading: boolean } {
  const uid = useAuthStore((s) => s.user?.uid);
  const program = useProgramStore((s) => s.program);
  const [lastDayId, setLastDayId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    findLastDoneSession(uid)
      .then((s) => alive && setLastDayId(s?.dayId ?? null))
      .catch((error: unknown) => {
        reportError(error, { where: "findLastDoneSession" });
        if (alive) setLastDayId(null);
      });
    return () => {
      alive = false;
    };
  }, [uid]);

  if (!program) return { day: null, loading: true };
  return { day: nextDay(program.days, lastDayId ?? null), loading: lastDayId === undefined };
}
