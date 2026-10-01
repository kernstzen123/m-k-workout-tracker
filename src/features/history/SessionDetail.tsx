"use client";

import { ArrowLeft, HeartPulse, Trophy } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, EmptyState, PageHeader, Spinner } from "@/components/ui/Page";
import { useAuthStore } from "@/features/auth/store";
import { useExercisesStore } from "@/features/exercises/store";
import { subscribeSessionCardio } from "@/lib/data/cardio";
import { getSessionWithSets } from "@/lib/data/history";
import { reportError } from "@/lib/monitoring";
import type { Session, WorkoutSet } from "@/lib/schemas/session";
import type { CardioEntry } from "@/lib/schemas/tracking";
import { formatClock } from "@/lib/timer";
import { setsForSlot } from "@/lib/workout/session";
import { formatDay, formatDuration, formatKg } from "./format";

const TYPE_LABEL = { warmup: "W", working: "", drop: "D", failure: "F" } as const;

export function SessionDetail() {
  const id = useSearchParams().get("id");
  const uid = useAuthStore((s) => s.user?.uid);
  const byId = useExercisesStore((s) => s.byId);
  const [data, setData] = useState<{ session: Session | null; sets: WorkoutSet[] } | null>(null);
  const [cardio, setCardio] = useState<CardioEntry[]>([]);

  useEffect(() => {
    if (!uid || !id) return;
    let alive = true;
    getSessionWithSets(uid, id)
      .then((d) => alive && setData(d))
      .catch((error: unknown) => {
        reportError(error, { where: "getSessionWithSets", id });
        if (alive) setData({ session: null, sets: [] });
      });
    const unsub = subscribeSessionCardio(uid, id, setCardio, (error) =>
      reportError(error, { where: "SessionDetail cardio" }),
    );
    return () => {
      alive = false;
      unsub();
    };
  }, [uid, id]);

  const back = (
    <Link
      href="/history"
      aria-label="Back to history"
      className="inline-flex size-12 items-center justify-center rounded-xl transition-colors hover:bg-surface-2"
    >
      <ArrowLeft aria-hidden className="size-6" />
    </Link>
  );

  if (!id) return <EmptyState title="No workout selected" />;
  if (data === null) return <Spinner label="Loading workout" />;
  const { session, sets } = data;
  if (!session) {
    return (
      <>
        <PageHeader title="Workout" action={back} />
        <EmptyState title="Workout not found">It may have been discarded.</EmptyState>
      </>
    );
  }

  const slots = session.exercises ?? [];
  return (
    <>
      <PageHeader
        eyebrow={formatDay(session.date, "EEEE d MMMM yyyy")}
        title={session.dayName ?? "Workout"}
        action={back}
      />
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-3 gap-2">
          <Stat label="Duration" value={formatDuration(session.durationSec)} />
          <Stat label="Volume" value={formatKg(session.totalVolume)} />
          <Stat
            label="Sets"
            value={String(session.setCount ?? sets.filter((s) => s.type !== "warmup").length)}
          />
          {session.avgRestSec ? (
            <Stat label="Avg rest" value={formatClock(session.avgRestSec)} />
          ) : null}
          {session.prCount ? <Stat label="PRs" value={String(session.prCount)} /> : null}
        </dl>

        {session.notes ? (
          <Card>
            <p className="eyebrow mb-1">Note</p>
            <p className="whitespace-pre-wrap">{session.notes}</p>
          </Card>
        ) : null}

        {slots.map((slot) => {
          const slotSets = setsForSlot(sets, slot, slots);
          if (slotSets.length === 0) return null;
          let n = 0;
          return (
            <Card key={slot.key}>
              <h2 className="mb-2 text-lg font-semibold">
                {byId.get(slot.exerciseId)?.name ?? slot.exerciseId}
              </h2>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs tracking-wider text-muted uppercase">
                    <th scope="col" className="w-12 py-1 font-semibold">
                      Set
                    </th>
                    <th scope="col" className="py-1 font-semibold">
                      Weight × reps
                    </th>
                    <th scope="col" className="py-1 text-right font-semibold">
                      RPE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {slotSets.map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="tabular py-2 font-display text-lg font-semibold">
                        {TYPE_LABEL[s.type] || String(++n)}
                      </td>
                      <td className="tabular py-2">
                        {s.weightKg} kg × {s.reps}
                        {s.isPR ? (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-warning/15 px-1.5 py-0.5 text-xs font-semibold text-warning">
                            <Trophy aria-hidden className="size-3" /> PR
                          </span>
                        ) : null}
                        {s.note ? <span className="block text-sm text-muted">{s.note}</span> : null}
                      </td>
                      <td className="tabular py-2 text-right text-muted">{s.rpe ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          );
        })}

        {cardio.map((c) => (
          <Card key={c.id} className="flex items-center gap-3">
            <HeartPulse aria-hidden className="size-5 text-accent" />
            <p className="flex-1 font-semibold">{c.type}</p>
            <p className="tabular">{c.durationMin} min</p>
          </Card>
        ))}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <dt className="eyebrow text-[0.6875rem]">{label}</dt>
      <dd className="tabular font-display text-xl font-semibold">{value}</dd>
    </div>
  );
}
