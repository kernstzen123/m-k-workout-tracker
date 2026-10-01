"use client";

import { Check, HeartPulse, MoreVertical, Undo2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { MiniNumber } from "@/components/ui/Stepper";
import { useExercisesStore } from "@/features/exercises/store";
import type { SessionExercise } from "@/lib/schemas/session";
import { toast } from "@/lib/toast";
import { useWorkoutStore } from "./store";

/** Low-intensity cardio finisher: log minutes in one tap; saved as a cardio entry on this session. */
export function CardioSlotCard({
  slot,
  handle,
  onOpenMenu,
}: {
  slot: SessionExercise;
  handle: ReactNode;
  onOpenMenu: () => void;
}) {
  const exercise = useExercisesStore((s) => s.byId.get(slot.exerciseId));
  const name = exercise?.name ?? slot.exerciseId;
  const entry = useWorkoutStore((s) => s.cardio.find((c) => c.type === name));
  const { logCardio, undoCardio } = useWorkoutStore.getState();
  const [minutes, setMinutes] = useState(String(slot.durationMin ?? 15));

  function log() {
    const durationMin = Number(minutes.replace(",", "."));
    if (!Number.isFinite(durationMin) || durationMin <= 0 || durationMin > 1440) {
      toast.error("Enter the minutes of cardio.");
      return;
    }
    logCardio({ type: name, durationMin });
  }

  return (
    <article aria-label={name} className="rounded-2xl border border-border bg-surface p-3">
      <header className="flex items-start gap-1">
        {handle}
        <div className="min-w-0 flex-1 py-1">
          <h2 className="truncate text-lg leading-tight font-semibold">{name}</h2>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <HeartPulse aria-hidden className="size-4" /> Low-intensity finisher
          </p>
        </div>
        <IconButton label={`${name} options`} onClick={onOpenMenu}>
          <MoreVertical aria-hidden />
        </IconButton>
      </header>

      {entry ? (
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-accent-soft p-2 pl-3">
          <Check aria-hidden className="size-5 text-accent" strokeWidth={3} />
          <p className="flex-1 font-semibold">
            <span className="tabular">{entry.durationMin}</span> min logged
          </p>
          <Button variant="ghost" icon={<Undo2 aria-hidden />} onClick={() => undoCardio(entry.id)}>
            Undo
          </Button>
        </div>
      ) : (
        <div className="mt-2 flex items-end gap-3">
          <MiniNumber
            label="Minutes"
            value={minutes}
            onChange={setMinutes}
            decimal
            className="w-24"
          />
          <Button className="flex-1" icon={<Check aria-hidden />} onClick={log}>
            Log cardio
          </Button>
        </div>
      )}
    </article>
  );
}
