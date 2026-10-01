"use client";

import { Plus, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { EQUIPMENT_LABELS, MUSCLES, MUSCLE_LABELS, type Muscle } from "@/lib/schemas/common";
import type { Exercise } from "@/lib/schemas/exercise";
import { filterExercises } from "./filter";
import { useExercisesStore } from "./store";

export interface ExercisePickerProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  onPick: (exercise: Exercise) => void;
}

/** Bottom sheet to choose an exercise from the shared library (archived ones hidden). */
export function ExercisePicker({
  open,
  title = "Add exercise",
  onClose,
  onPick,
}: ExercisePickerProps) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {open ? <PickerBody onPick={onPick} /> : null}
    </Sheet>
  );
}

function PickerBody({ onPick }: { onPick: (exercise: Exercise) => void }) {
  const exercises = useExercisesStore((s) => s.exercises);
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<Muscle | "all">("all");
  const deferred = useDeferredValue(query);
  const visible = useMemo(
    () => filterExercises(exercises, { query: deferred, muscle, showArchived: false }),
    [exercises, deferred, muscle],
  );

  return (
    <div className="flex flex-col gap-3">
      <label className="relative block">
        <span className="sr-only">Search exercises</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises"
          className="min-h-12 w-full rounded-xl border border-border-strong bg-surface-2 pr-3 pl-10 text-base transition-colors placeholder:text-muted focus-visible:border-accent"
        />
      </label>
      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
        role="group"
        aria-label="Filter by muscle"
      >
        <Chip selected={muscle === "all"} onClick={() => setMuscle("all")}>
          All
        </Chip>
        {MUSCLES.map((m) => (
          <Chip key={m} selected={muscle === m} onClick={() => setMuscle(m)}>
            {MUSCLE_LABELS[m]}
          </Chip>
        ))}
      </div>
      {visible.length === 0 ? (
        <EmptyState title="No exercises found">
          Add new exercises in the exercise library.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {visible.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onPick(e)}
                className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors hover:bg-surface-2 active:bg-surface-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{e.name}</span>
                  <span className="block truncate text-sm text-muted">
                    {MUSCLE_LABELS[e.muscle]} · {EQUIPMENT_LABELS[e.equipment]}
                  </span>
                </span>
                <Plus aria-hidden className="size-5 shrink-0 text-accent" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
