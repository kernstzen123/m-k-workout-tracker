"use client";

import { formatDistanceToNow } from "date-fns";
import { Link2, Pencil, Timer } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Chip";
import { Card, EmptyState, PageHeader, Spinner } from "@/components/ui/Page";
import { useExercisesStore } from "@/features/exercises/store";
import { groupSupersets } from "@/lib/program/groups";
import type { ProgramDay, ProgramItem } from "@/lib/schemas/program";
import { ProgramEditor } from "./ProgramEditor";
import { useProgramStore } from "./store";
import { useEditorName } from "./useEditorName";

export function ProgramScreen() {
  const { program, status } = useProgramStore();
  const [editing, setEditing] = useState(false);
  const editorName = useEditorName(program?.updatedBy);

  if (editing && program)
    return <ProgramEditor program={program} onDone={() => setEditing(false)} />;

  return (
    <>
      <PageHeader
        eyebrow="Shared program"
        title="Program"
        action={
          program ? (
            <Button
              variant="secondary"
              icon={<Pencil aria-hidden />}
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
          ) : null
        }
      />
      {!program ? (
        status === "loading" ? (
          <Spinner label="Loading program" />
        ) : (
          <EmptyState title="No program yet">
            It will be created when you&apos;re online.
          </EmptyState>
        )
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            <span className="font-semibold text-fg">{program.name}</span> · version{" "}
            {program.version}
            <br />
            Last edited by {editorName}{" "}
            {formatDistanceToNow(program.updatedAt, { addSuffix: true })}. Changes apply to both of
            you; past workouts are never altered.
          </p>
          {program.days.map((day, i) => (
            <DayCard key={day.dayId} day={day} index={i} />
          ))}
        </div>
      )}
    </>
  );
}

function DayCard({ day, index }: { day: ProgramDay; index: number }) {
  return (
    <Card>
      <p className="eyebrow">Day {index + 1}</p>
      <h2 className="mb-3 font-display text-2xl font-semibold tracking-wide uppercase">
        {day.name}
      </h2>
      {day.items.length === 0 ? (
        <p className="text-muted">No exercises yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {groupSupersets(day.items).map((group, gi) =>
            group.supersetGroup ? (
              <li key={gi} className="rounded-xl border-l-4 border-accent bg-accent-soft py-1 pl-3">
                <p className="eyebrow flex items-center gap-1.5 pt-1 text-accent">
                  <Link2 aria-hidden className="size-4" /> Superset {group.supersetGroup}
                </p>
                <ul>
                  {group.items.map(({ item, index: i }) => (
                    <ItemLine key={i} item={item} />
                  ))}
                </ul>
              </li>
            ) : (
              <ItemLine key={gi} item={group.items[0]!.item} />
            ),
          )}
        </ul>
      )}
    </Card>
  );
}

function ItemLine({ item }: { item: ProgramItem }) {
  const exercise = useExercisesStore((s) => s.byId.get(item.exerciseId));
  const isCardio = exercise?.type === "cardio" || item.durationMin !== undefined;
  return (
    <li className="flex min-h-11 items-center justify-between gap-3 py-1">
      <span className="min-w-0">
        <span className="block truncate font-semibold">{exercise?.name ?? item.exerciseId}</span>
        {isCardio ? (
          <span className="flex items-center gap-1 text-sm text-muted">
            <Timer aria-hidden className="size-4" /> Low-intensity finisher
          </span>
        ) : null}
      </span>
      <span className="tabular shrink-0 font-display text-lg font-semibold">
        {isCardio
          ? `${item.durationMin ?? 15} min`
          : `${item.sets} × ${item.repMin}–${item.repMax}`}
      </span>
      {exercise?.archived ? <Badge>Archived</Badge> : null}
    </li>
  );
}
