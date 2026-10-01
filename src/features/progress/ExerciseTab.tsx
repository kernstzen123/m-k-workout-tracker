"use client";

import { Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { TrendChart } from "@/components/charts/TrendChart";
import { Chip } from "@/components/ui/Chip";
import { SelectField } from "@/components/ui/Field";
import { Card, EmptyState, Spinner } from "@/components/ui/Page";
import { useAuthStore } from "@/features/auth/store";
import { useExercisesStore } from "@/features/exercises/store";
import { formatDay } from "@/features/history/format";
import { getPrs } from "@/lib/data/prs";
import { listTrainedExercises } from "@/lib/data/progress";
import { reportError } from "@/lib/monitoring";
import type { LastSetsDoc, SessionSummary } from "@/lib/schemas/session";
import type { PrDoc } from "@/lib/schemas/stats";

const METRICS = [
  { id: "e1rm", label: "Est. 1RM", unit: "kg", value: (h: SessionSummary) => h.e1rm },
  { id: "top", label: "Top set", unit: "kg", value: (h: SessionSummary) => h.topWeightKg },
  { id: "volume", label: "Volume", unit: "kg", value: (h: SessionSummary) => h.volume },
] as const;
type Metric = (typeof METRICS)[number];

export function ExerciseTab() {
  const uid = useAuthStore((s) => s.user?.uid);
  const byId = useExercisesStore((s) => s.byId);
  const [trained, setTrained] = useState<Array<LastSetsDoc & { exerciseId: string }> | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>(METRICS[0]);
  const [prs, setPrs] = useState<PrDoc | null>(null);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    listTrainedExercises(uid)
      .then((list) => {
        if (!alive) return;
        setTrained(list);
        setSelected((cur) => cur ?? list[0]?.exerciseId ?? null);
      })
      .catch((error: unknown) => {
        reportError(error, { where: "listTrainedExercises" });
        if (alive) setTrained([]);
      });
    return () => {
      alive = false;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || !selected) return;
    let alive = true;
    getPrs(uid, selected)
      .then((p) => alive && setPrs(p))
      .catch((error: unknown) => reportError(error, { where: "getPrs(progress)" }));
    return () => {
      alive = false;
    };
  }, [uid, selected]);

  const current = trained?.find((t) => t.exerciseId === selected) ?? null;
  const points = useMemo(
    () =>
      (current?.history ?? []).map((h) => ({
        label: formatDay(h.date, "d MMM"),
        date: h.date,
        value: metric.value(h),
        top: `${h.topWeightKg} kg × ${h.topReps}`,
      })),
    [current, metric],
  );

  if (trained === null) return <Spinner label="Loading exercises" />;
  if (trained.length === 0) {
    return (
      <EmptyState title="No data yet">Finish a workout and your progress shows up here.</EmptyState>
    );
  }

  const name = (id: string) => byId.get(id)?.name ?? id;
  const fmt = (v: number) => `${Math.round(v * 10) / 10} kg`;

  return (
    <div className="flex flex-col gap-4">
      <SelectField
        label="Exercise"
        value={selected ?? ""}
        onChange={(e) => setSelected(e.target.value)}
        options={trained
          .map((t) => ({ value: t.exerciseId, label: name(t.exerciseId) }))
          .sort((a, b) => a.label.localeCompare(b.label))}
      />
      <div className="flex gap-2" role="group" aria-label="Metric">
        {METRICS.map((m) => (
          <Chip key={m.id} selected={metric.id === m.id} onClick={() => setMetric(m)}>
            {m.label}
          </Chip>
        ))}
      </div>

      <ChartFrame
        title={`${metric.label} · ${selected ? name(selected) : ""}`}
        subtitle={`${points.length} session${points.length === 1 ? "" : "s"}`}
        table={{
          caption: `${metric.label} per session`,
          rows: points,
          columns: [
            { label: "Date", value: (r) => formatDay(r.date) },
            { label: "Top set", value: (r) => r.top },
            { label: metric.label, value: (r) => fmt(r.value), numeric: true },
          ],
        }}
      >
        {points.length < 2 ? (
          <p className="py-8 text-center text-sm text-muted">
            Log this exercise twice to see a trend.
          </p>
        ) : (
          <TrendChart
            data={points}
            series={[
              { key: "value", label: metric.label, color: "chart-1", kind: "line", format: fmt },
            ]}
          />
        )}
      </ChartFrame>

      {prs ? (
        <Card>
          <p className="eyebrow mb-2 flex items-center gap-2">
            <Trophy aria-hidden className="size-4 text-warning" /> Personal records
          </p>
          <dl className="grid grid-cols-2 gap-3">
            <Pr
              label="Heaviest"
              value={`${prs.bestWeight} kg × ${prs.bestReps}`}
              date={prs.dates.weight}
            />
            <Pr label="Best est. 1RM" value={`${prs.bestE1RM} kg`} date={prs.dates.e1rm} />
            <Pr
              label="Best volume"
              value={`${prs.bestVolume.toLocaleString()} kg`}
              date={prs.dates.volume}
            />
          </dl>
        </Card>
      ) : null}
    </div>
  );
}

function Pr({ label, value, date }: { label: string; value: string; date?: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="tabular font-display text-xl font-semibold">{value}</dd>
      {date ? <dd className="text-xs text-muted">{formatDay(date, "d MMM yyyy")}</dd> : null}
    </div>
  );
}
