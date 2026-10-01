"use client";

import { ArrowDown, ArrowUp, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useChartColors } from "@/components/charts/useChartColors";
import { Chip } from "@/components/ui/Chip";
import { EmptyState, Spinner } from "@/components/ui/Page";
import { useAuthStore } from "@/features/auth/store";
import { listWeeklyStats } from "@/lib/data/progress";
import { isoWeekId } from "@/lib/dates";
import { weekTotals } from "@/lib/stats/weekly";
import { reportError } from "@/lib/monitoring";
import { TARGET_BANDS, bandStatus, type BandStatus } from "@/lib/overload/volume";
import { MUSCLES, MUSCLE_LABELS, type Muscle } from "@/lib/schemas/common";
import type { WeeklyStats } from "@/lib/schemas/stats";

const STATUS: Record<
  Exclude<BandStatus, "none">,
  { label: string; icon: typeof Check; className: string }
> = {
  below: { label: "Below target", icon: ArrowDown, className: "text-warning" },
  within: { label: "In range", icon: Check, className: "text-success" },
  above: { label: "Above target", icon: ArrowUp, className: "text-warning" },
};

/** Weekly working sets per muscle against target bands (HTML bars: labelled, no hover needed). */
export function MuscleTab() {
  const uid = useAuthStore((s) => s.user?.uid);
  const c = useChartColors();
  const [weeks, setWeeks] = useState<WeeklyStats[] | null>(null);
  const [weekId, setWeekId] = useState(() => isoWeekId());

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    listWeeklyStats(uid, 8)
      .then((w) => alive && setWeeks(w))
      .catch((error: unknown) => {
        reportError(error, { where: "listWeeklyStats" });
        if (alive) setWeeks([]);
      });
    return () => {
      alive = false;
    };
  }, [uid]);

  if (weeks === null) return <Spinner label="Loading weekly volume" />;
  const thisWeek = isoWeekId();
  const options = [thisWeek, ...weeks.map((w) => w.id).filter((id) => id !== thisWeek)].slice(0, 6);
  const doc = weeks.find((w) => w.id === weekId);
  const week = doc ? weekTotals(doc) : null;
  const rows = MUSCLES.filter((m) => TARGET_BANDS[m]).map((m) => ({
    muscle: m,
    sets: Math.round((week?.muscles[m]?.sets ?? 0) * 10) / 10,
    band: TARGET_BANDS[m]!,
  }));
  const scaleMax = Math.max(24, ...rows.map((r) => r.sets));

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Week">
        {options.map((id) => (
          <Chip key={id} selected={weekId === id} onClick={() => setWeekId(id)}>
            {id === thisWeek ? "This week" : id.replace(/^\d{4}-/, "")}
          </Chip>
        ))}
      </div>

      {!week ? (
        <EmptyState title="Nothing logged this week">Finished workouts add up here.</EmptyState>
      ) : (
        <figure className="rounded-2xl border border-border bg-surface p-4">
          <figcaption className="mb-3">
            <p className="eyebrow">Working sets per muscle</p>
            <p className="text-sm text-muted">
              {week.sessions} workout{week.sessions === 1 ? "" : "s"} · secondary muscles count as ½
              set · shaded band = target
            </p>
          </figcaption>
          <ul className="flex flex-col gap-3">
            {rows.map((r) => {
              const status = bandStatus(r.muscle, r.sets);
              const s = status === "none" ? null : STATUS[status];
              const Icon = s?.icon;
              return (
                <li key={r.muscle}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-semibold">{MUSCLE_LABELS[r.muscle as Muscle]}</span>
                    <span className="flex items-center gap-1.5 text-muted">
                      <span className="tabular font-semibold text-fg">{r.sets}</span> / {r.band.min}
                      –{r.band.max} sets
                      {s && Icon ? (
                        <span className={`flex items-center gap-0.5 ${s.className}`}>
                          <Icon aria-hidden className="size-3.5" />
                          <span className="sr-only">{s.label}</span>
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div
                    className="relative h-3 overflow-hidden rounded-full"
                    style={{ background: c.grid }}
                    aria-hidden
                  >
                    <div
                      className="absolute inset-y-0"
                      style={{
                        left: `${(r.band.min / scaleMax) * 100}%`,
                        width: `${((r.band.max - r.band.min) / scaleMax) * 100}%`,
                        background: c.bandFill,
                        boxShadow: `inset 0 0 0 1px ${c.muted}55`,
                      }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 rounded-r-full"
                      style={{
                        width: `${Math.min(100, (r.sets / scaleMax) * 100)}%`,
                        background: c.series1,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <ul
            className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted"
            aria-label="Status key"
          >
            {Object.values(STATUS).map((s) => (
              <li key={s.label} className={`flex items-center gap-1 ${s.className}`}>
                <s.icon aria-hidden className="size-3.5" />
                <span className="text-muted">{s.label}</span>
              </li>
            ))}
          </ul>
        </figure>
      )}
    </div>
  );
}
