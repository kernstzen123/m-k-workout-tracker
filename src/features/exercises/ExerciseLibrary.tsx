"use client";

import { ChevronRight, Plus, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { IconButton } from "@/components/ui/Button";
import { Badge, Chip } from "@/components/ui/Chip";
import { EmptyState, PageHeader, Spinner } from "@/components/ui/Page";
import { EQUIPMENT_LABELS, MUSCLES, MUSCLE_LABELS, type Muscle } from "@/lib/schemas/common";
import type { Exercise } from "@/lib/schemas/exercise";
import { ExerciseForm } from "./ExerciseForm";
import { filterExercises } from "./filter";
import { useExercisesStore } from "./store";

export function ExerciseLibrary() {
  const { exercises, status } = useExercisesStore();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<Muscle | "all">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const visible = useMemo(
    () => filterExercises(exercises, { query: deferredQuery, muscle, showArchived }),
    [exercises, deferredQuery, muscle, showArchived],
  );

  const openForm = (exercise: Exercise | null) => {
    setEditing(exercise);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Exercises"
        action={
          <IconButton label="Add exercise" variant="primary" onClick={() => openForm(null)}>
            <Plus aria-hidden />
          </IconButton>
        }
      >
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted" aria-live="polite">
            {visible.length} exercise{visible.length === 1 ? "" : "s"}
          </p>
          <Chip selected={showArchived} onClick={() => setShowArchived((v) => !v)}>
            Show archived
          </Chip>
        </div>
      </PageHeader>

      {status === "loading" && exercises.length === 0 ? (
        <Spinner label="Loading exercises" />
      ) : visible.length === 0 ? (
        <EmptyState title="No exercises found">
          Try a different search, or add a new exercise with the + button.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => openForm(e)}
                className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5 text-left transition-colors hover:bg-surface-2 active:bg-surface-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[1.0625rem] font-semibold">{e.name}</span>
                    {e.archived ? <Badge>Archived</Badge> : null}
                  </span>
                  <span className="block truncate text-sm text-muted">
                    {MUSCLE_LABELS[e.muscle]} · {EQUIPMENT_LABELS[e.equipment]}
                    {e.type === "strength" ? ` · ${e.repMin}–${e.repMax} reps` : ""}
                    {e.type === "strength" && e.incrementKg > 0 ? ` · +${e.incrementKg} kg` : ""}
                  </span>
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ExerciseForm open={formOpen} exercise={editing} onClose={() => setFormOpen(false)} />
    </>
  );
}
