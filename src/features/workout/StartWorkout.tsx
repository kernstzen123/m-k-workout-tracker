"use client";

import { ChevronRight, Dumbbell, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, PageHeader, Spinner } from "@/components/ui/Page";
import { useExercisesStore } from "@/features/exercises/store";
import { useProgramStore } from "@/features/program/store";
import type { ProgramDay } from "@/lib/schemas/program";
import { useWorkoutStore } from "./store";
import { useNextDay } from "./useNextDay";

export function dayPreview(day: ProgramDay, names: ReadonlyMap<string, { name: string }>): string {
  return day.items
    .map((i) => names.get(i.exerciseId)?.name)
    .filter(Boolean)
    .slice(0, 3)
    .join(" · ");
}

/** Choose what to train: the suggested next day, any other day, or an empty workout. */
export function StartWorkout() {
  const program = useProgramStore((s) => s.program);
  const byId = useExercisesStore((s) => s.byId);
  const start = useWorkoutStore((s) => s.start);
  const { day: suggested } = useNextDay();

  const startDay = (day: ProgramDay | null) =>
    start({ day, programVersion: day ? (program?.version ?? null) : null });

  return (
    <>
      <PageHeader eyebrow="Ready?" title="Start workout" />
      {!program ? (
        <Spinner label="Loading program" />
      ) : (
        <div className="flex flex-col gap-4">
          {suggested ? (
            <Card className="flex flex-col gap-3">
              <CardTitle className="mb-0">Up next</CardTitle>
              <div>
                <p className="font-display text-3xl font-semibold tracking-wide uppercase">
                  {suggested.name}
                </p>
                <p className="text-sm text-muted">
                  {suggested.items.length} exercises · {dayPreview(suggested, byId)}
                </p>
              </div>
              <Button
                size="lg"
                block
                icon={<Dumbbell aria-hidden />}
                onClick={() => startDay(suggested)}
              >
                Start {suggested.name}
              </Button>
            </Card>
          ) : null}

          <section aria-labelledby="other-days">
            <h2 id="other-days" className="eyebrow mb-2">
              Or pick a day
            </h2>
            <ul className="flex flex-col gap-2">
              {program.days.map((day) => (
                <li key={day.dayId}>
                  <button
                    type="button"
                    onClick={() => startDay(day)}
                    className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 text-left transition-colors hover:bg-surface-2 active:bg-surface-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-xl font-semibold tracking-wide uppercase">
                        {day.name}
                      </span>
                      <span className="block truncate text-sm text-muted">
                        {dayPreview(day, byId)}
                      </span>
                    </span>
                    <ChevronRight aria-hidden className="size-5 text-muted" />
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => startDay(null)}
                  className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-dashed border-border-strong px-4 text-left transition-colors hover:bg-surface-2 active:bg-surface-3"
                >
                  <Plus aria-hidden className="size-5 text-accent" />
                  <span className="flex-1 font-semibold">Empty workout</span>
                </button>
              </li>
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
