"use client";

import { CalendarCheck, Flame, Hourglass, Timer } from "lucide-react";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { WeeklyBars } from "@/components/charts/WeeklyBars";
import { Spinner, Stat } from "@/components/ui/Page";
import { formatDuration } from "@/features/history/format";
import { CONSISTENCY_WEEKS, useRecentSessions } from "@/features/history/useRecentSessions";
import { formatClock } from "@/lib/timer";

export function ConsistencyTab() {
  const { stats, loading } = useRecentSessions();
  if (loading) return <Spinner label="Loading consistency" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Streak"
          value={`${stats.streakWeeks} wk${stats.streakWeeks === 1 ? "" : "s"}`}
          icon={<Flame aria-hidden className="size-6 text-warning" />}
        />
        <Stat
          label="This week"
          value={String(stats.thisWeek)}
          icon={<CalendarCheck aria-hidden className="size-6 text-accent" />}
        />
        <Stat
          label="Avg duration"
          value={stats.avgDurationSec ? formatDuration(stats.avgDurationSec) : "—"}
          icon={<Hourglass aria-hidden className="size-6 text-accent" />}
        />
        <Stat
          label="Avg rest"
          value={stats.avgRestSec ? formatClock(stats.avgRestSec) : "—"}
          icon={<Timer aria-hidden className="size-6 text-accent" />}
        />
      </div>
      <ChartFrame
        title="Workouts per week"
        subtitle={`Last ${CONSISTENCY_WEEKS} weeks · average ${stats.avgPerWeek} per week`}
        table={{
          caption: "Workouts per week",
          rows: stats.weeks,
          columns: [
            { label: "Week of", value: (r) => r.label },
            { label: "Workouts", value: (r) => r.sessions, numeric: true },
          ],
        }}
      >
        <WeeklyBars
          data={stats.weeks}
          dataKey="sessions"
          seriesLabel="Workouts"
          format={(v) => String(v)}
        />
      </ChartFrame>
      <p className="text-sm text-muted">
        The streak counts consecutive weeks with at least one workout; a week in progress
        doesn&apos;t break it.
      </p>
    </div>
  );
}
