"use client";

import { CalendarCheck, Dumbbell, Flame } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, PageHeader, Stat } from "@/components/ui/Page";
import { useAuthStore } from "@/features/auth/store";
import { InstallCard } from "@/features/pwa/InstallCard";

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

        <Card className="flex flex-col gap-4">
          <div>
            <CardTitle className="mb-1">Today&apos;s workout</CardTitle>
            <p className="font-display text-2xl font-semibold tracking-wide uppercase">
              Ready when you are
            </p>
            <p className="mt-1 text-muted">Program days and live logging arrive in Phase 2.</p>
          </div>
          <Button size="lg" block disabled icon={<Dumbbell aria-hidden />}>
            Start workout
          </Button>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Stat
            label="Streak"
            value="—"
            icon={<Flame aria-hidden className="size-6 text-warning" />}
          />
          <Stat
            label="This week"
            value="—"
            icon={<CalendarCheck aria-hidden className="size-6 text-accent" />}
          />
        </div>
      </div>
    </>
  );
}
