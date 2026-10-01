"use client";

import { EyeOff, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { TrendChart } from "@/components/charts/TrendChart";
import { useChartColors } from "@/components/charts/useChartColors";
import { Chip } from "@/components/ui/Chip";
import { SelectField } from "@/components/ui/Field";
import { EmptyState, PageHeader, Spinner } from "@/components/ui/Page";
import { useAuthStore } from "@/features/auth/store";
import { useExercisesStore } from "@/features/exercises/store";
import { formatDay } from "@/features/history/format";
import { buildComparison, mergeTrend, type CompareMetric } from "@/lib/compare";
import { findPartner, listPrs } from "@/lib/data/compare";
import { getLastSets } from "@/lib/data/lastSets";
import { errorCode, reportError } from "@/lib/monitoring";
import type { PrDoc } from "@/lib/schemas/stats";
import type { UserProfile } from "@/lib/schemas/user";

const METRICS: Array<{ id: CompareMetric; label: string }> = [
  { id: "e1rm", label: "Est. 1RM" },
  { id: "weight", label: "Heaviest" },
  { id: "volume", label: "Best volume" },
];

type State =
  | { kind: "loading" }
  | { kind: "no-partner" }
  | { kind: "partner-private"; partner: UserProfile }
  | {
      kind: "ready";
      partner: UserProfile & { uid: string };
      mine: Record<string, PrDoc>;
      theirs: Record<string, PrDoc>;
    }
  | { kind: "error" };

export function CompareScreen() {
  const uid = useAuthStore((s) => s.user?.uid);
  const profile = useAuthStore((s) => s.profile);
  const sharing = profile?.shareCompare !== false;
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!uid || !sharing) return;
    let alive = true;
    (async () => {
      const partner = await findPartner(uid);
      if (!partner) return alive && setState({ kind: "no-partner" });
      if (partner.shareCompare === false)
        return alive && setState({ kind: "partner-private", partner });
      try {
        const [mine, theirs] = await Promise.all([listPrs(uid), listPrs(partner.uid)]);
        if (alive) setState({ kind: "ready", partner, mine, theirs });
      } catch (error) {
        // Partner turned sharing off since their profile was cached.
        if (errorCode(error) === "permission-denied") {
          if (alive) setState({ kind: "partner-private", partner });
          return;
        }
        throw error;
      }
    })().catch((error: unknown) => {
      reportError(error, { where: "CompareScreen" });
      if (alive) setState({ kind: "error" });
    });
    return () => {
      alive = false;
    };
  }, [uid, sharing]);

  return (
    <>
      <PageHeader eyebrow="Side by side" title="Compare" />
      {!sharing ? (
        <EmptyState icon={<EyeOff aria-hidden />} title="You've hidden your lifts">
          Comparing is two-way. Turn on <strong>Share my lifts in Compare</strong> in{" "}
          <Link href="/settings" className="font-semibold text-accent underline underline-offset-4">
            Settings
          </Link>{" "}
          to see each other&apos;s numbers.
        </EmptyState>
      ) : state.kind === "loading" ? (
        <Spinner label="Loading lifts" />
      ) : state.kind === "no-partner" ? (
        <EmptyState icon={<Users aria-hidden />} title="No partner yet">
          Their numbers appear here once they&apos;ve signed in and finished a workout.
        </EmptyState>
      ) : state.kind === "partner-private" ? (
        <EmptyState icon={<EyeOff aria-hidden />} title={`${state.partner.name} isn't sharing`}>
          They&apos;ve turned off sharing in their settings.
        </EmptyState>
      ) : state.kind === "error" ? (
        <EmptyState title="Couldn't load the comparison">
          Check your connection and try again.
        </EmptyState>
      ) : (
        <Comparison
          myUid={uid!}
          myName={profile?.name ?? "You"}
          partner={state.partner}
          mine={state.mine}
          theirs={state.theirs}
        />
      )}
    </>
  );
}

function Comparison({
  myUid,
  myName,
  partner,
  mine,
  theirs,
}: {
  myUid: string;
  myName: string;
  partner: UserProfile & { uid: string };
  mine: Record<string, PrDoc>;
  theirs: Record<string, PrDoc>;
}) {
  const c = useChartColors();
  const byId = useExercisesStore((s) => s.byId);
  const [metric, setMetric] = useState<CompareMetric>("e1rm");
  const rows = useMemo(() => buildComparison(mine, theirs, metric), [mine, theirs, metric]);
  const both = rows.filter((r) => r.mine !== null && r.theirs !== null);
  const name = (id: string) => byId.get(id)?.name ?? id;
  const legend = [
    { label: myName, color: c.series1, mark: "bar" as const },
    { label: partner.name, color: c.series2, mark: "bar" as const },
  ];

  if (rows.length === 0) {
    return (
      <EmptyState icon={<Users aria-hidden />} title="Nothing to compare yet">
        Finish a few workouts each and your records show up here.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2" role="group" aria-label="Metric">
        {METRICS.map((m) => (
          <Chip key={m.id} selected={metric === m.id} onClick={() => setMetric(m.id)}>
            {m.label}
          </Chip>
        ))}
      </div>

      <ChartFrame
        title={`Personal records · ${METRICS.find((m) => m.id === metric)?.label}`}
        subtitle="Each lift is scaled on its own, so bars compare the two of you, not lifts."
        legend={legend}
        table={{
          caption: "Personal records side by side",
          rows: [...rows].reverse(),
          columns: [
            { label: "Lift", value: (r) => name(r.exerciseId) },
            { label: myName, value: (r) => r.mineDetail ?? "—", numeric: true },
            { label: partner.name, value: (r) => r.theirsDetail ?? "—", numeric: true },
          ],
        }}
      >
        <ul className="flex flex-col gap-4">
          {rows.map((r) => {
            const max = Math.max(r.mine ?? 0, r.theirs ?? 0) || 1;
            return (
              <li key={r.exerciseId}>
                <p className="mb-1.5 font-semibold">{name(r.exerciseId)}</p>
                {[
                  { who: myName, value: r.mine, detail: r.mineDetail, color: c.series1 },
                  { who: partner.name, value: r.theirs, detail: r.theirsDetail, color: c.series2 },
                ].map((b) => (
                  <div key={b.who} className="mb-1 flex items-center gap-2">
                    <span className="sr-only">{b.who}:</span>
                    <div className="h-3 flex-1" aria-hidden>
                      {b.value !== null ? (
                        <div
                          className="h-3 rounded-r-[4px]"
                          style={{ width: `${(b.value / max) * 100}%`, background: b.color }}
                        />
                      ) : null}
                    </div>
                    <span className="tabular w-28 shrink-0 text-right text-sm">
                      {b.detail ?? <span className="text-muted">not done</span>}
                    </span>
                  </div>
                ))}
              </li>
            );
          })}
        </ul>
      </ChartFrame>

      {both.length > 0 ? (
        <TrendCompare
          myUid={myUid}
          partnerUid={partner.uid}
          options={both.map((r) => ({ value: r.exerciseId, label: name(r.exerciseId) }))}
          legend={legend}
          myName={myName}
          partnerName={partner.name}
        />
      ) : null}
    </div>
  );
}

function TrendCompare({
  myUid,
  partnerUid,
  options,
  legend,
  myName,
  partnerName,
}: {
  myUid: string;
  partnerUid: string;
  options: Array<{ value: string; label: string }>;
  legend: Array<{ label: string; color: string; mark: "bar" }>;
  myName: string;
  partnerName: string;
}) {
  const [exerciseId, setExerciseId] = useState(options[0]!.value);
  const [points, setPoints] = useState<ReturnType<typeof mergeTrend> | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getLastSets(myUid, exerciseId), getLastSets(partnerUid, exerciseId)])
      .then(([a, b]) => alive && setPoints(mergeTrend(a?.history, b?.history)))
      .catch((error: unknown) => {
        reportError(error, { where: "TrendCompare" });
        if (alive) setPoints([]);
      });
    return () => {
      alive = false;
    };
  }, [myUid, partnerUid, exerciseId]);

  const data = (points ?? []).map((p) => ({ ...p, label: formatDay(p.date, "d MMM") }));
  const fmt = (v: number) => `${v} kg`;

  return (
    <ChartFrame
      title="Est. 1RM over time"
      legend={legend.map((l) => ({ ...l, mark: "line" as const }))}
      table={{
        caption: "Estimated 1RM per session",
        rows: data,
        columns: [
          { label: "Date", value: (r) => formatDay(r.date) },
          { label: myName, value: (r) => (r.mine != null ? fmt(r.mine) : "—"), numeric: true },
          {
            label: partnerName,
            value: (r) => (r.theirs != null ? fmt(r.theirs) : "—"),
            numeric: true,
          },
        ],
      }}
    >
      <SelectField
        label="Lift"
        className="mb-3"
        value={exerciseId}
        onChange={(e) => setExerciseId(e.target.value)}
        options={options}
      />
      {points === null ? (
        <Spinner label="Loading trend" />
      ) : data.length < 2 ? (
        <p className="py-8 text-center text-sm text-muted">Not enough sessions yet for a trend.</p>
      ) : (
        <TrendChart
          data={data}
          series={[
            { key: "mine", label: myName, color: "chart-1", kind: "line", format: fmt },
            { key: "theirs", label: partnerName, color: "chart-2", kind: "line", format: fmt },
          ]}
        />
      )}
    </ChartFrame>
  );
}
