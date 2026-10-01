"use client";

import { Dumbbell, Flame } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Page";
import { useAuthStore } from "@/features/auth/store";
import { InstallCard } from "@/features/pwa/InstallCard";

export function HomeScreen() {
  const profile = useAuthStore((s) => s.profile);

  return (
    <>
      <PageHeader title={`Hi ${profile?.name ?? "there"}`} />
      <div className="flex flex-col gap-4">
        <InstallCard />

        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Today&apos;s workout</h2>
          <p className="text-muted">Program days and live logging arrive in Phase 2.</p>
          <Button size="lg" block disabled icon={<Dumbbell aria-hidden />}>
            Start workout
          </Button>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-sm text-muted">Streak</p>
            <p className="tabular flex items-center gap-1 text-2xl font-bold">
              <Flame aria-hidden className="size-5 text-warning" />—
            </p>
          </Card>
          <Card>
            <p className="text-sm text-muted">This week</p>
            <p className="tabular text-2xl font-bold">—</p>
          </Card>
        </div>
      </div>
    </>
  );
}
