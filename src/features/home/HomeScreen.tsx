"use client";

import { CalendarCheck, Dumbbell, Flame, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, PageHeader, Stat } from "@/components/ui/Page";
import { useAuthStore } from "@/features/auth/store";
import { useExercisesStore } from "@/features/exercises/store";
import { useProgramStore } from "@/features/program/store";
import { InstallCard } from "@/features/pwa/InstallCard";
import { dayPreview } from "@/features/workout/StartWorkout";
import { useWorkoutStore } from "@/features/workout/store";
import { useNextDay } from "@/features/workout/useNextDay";
import { useRecentSessions } from "@/features/history/useRecentSessions";

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeScreen() {
  const profile = useAuthStore((s) => s.profile);

  return (
    <>
      <PageHeader
        eyebrow={greeting(new Date().getHours())}
        title={`Hi ${profile?.name ?? "there"}`}
      />
      <div className="flex flex-col gap-4">
        <InstallCard />
        <TodayCard />
        <QuickStats />
      </div>
    </>
  );
}

function QuickStats() {
  const { stats, loading } = useRecentSessions();
  const v = (n: number) => (loading ? "—" : String(n));
  return (
    <div className="grid grid-cols-2 gap-3">
      <Stat
        label="Week streak"
        value={v(stats.streakWeeks)}
        icon={<Flame aria-hidden className="size-6 text-warning" />}
      />
      <Stat
        label="This week"
        value={v(stats.thisWeek)}
        icon={<CalendarCheck aria-hidden className="size-6 text-accent" />}
      />
    </div>
  );
}

function TodayCard() {
  const router = useRouter();
  const status = useWorkoutStore((s) => s.status);
  const session = useWorkoutStore((s) => s.session);
  const setCount = useWorkoutStore((s) => s.sets.length);
  const start = useWorkoutStore((s) => s.start);
  const version = useProgramStore((s) => s.program?.version ?? null);
  const byId = useExercisesStore((s) => s.byId);
  const { day } = useNextDay();

  if (status === "active" && session) {
    return (
      <Card className="flex flex-col gap-4 border-accent">
        <div>
          <CardTitle className="mb-1">Workout in progress</CardTitle>
          <p className="font-display text-3xl font-semibold tracking-wide uppercase">
            {session.dayName ?? "Workout"}
          </p>
          <p className="text-sm text-muted">
            {setCount} set{setCount === 1 ? "" : "s"} logged · saved on this device
          </p>
        </div>
        <Button size="lg" block icon={<Play aria-hidden />} onClick={() => router.push("/workout")}>
          Resume workout
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <CardTitle className="mb-1">Today&apos;s workout</CardTitle>
        <p className="font-display text-3xl font-semibold tracking-wide uppercase">
          {day?.name ?? "Ready when you are"}
        </p>
        {day ? <p className="truncate text-sm text-muted">{dayPreview(day, byId)}</p> : null}
      </div>
      <Button
        size="lg"
        block
        icon={<Dumbbell aria-hidden />}
        disabled={!day || status === "checking"}
        onClick={() => {
          if (!day) return;
          start({ day, programVersion: version });
          router.push("/workout");
        }}
      >
        {day ? `Start ${day.name}` : "Start workout"}
      </Button>
      <Link
        href="/workout"
        className="text-center text-sm font-semibold text-accent underline-offset-4 hover:underline"
      >
        Choose another day or an empty workout
      </Link>
    </Card>
  );
}
