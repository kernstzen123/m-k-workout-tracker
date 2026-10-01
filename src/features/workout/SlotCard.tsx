"use client";

import { Check, Link2, MoreVertical, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Chip";
import { useAuthStore } from "@/features/auth/store";
import { useExercisesStore } from "@/features/exercises/store";
import { primeAudio } from "@/features/rest-timer/alerts";
import { useRestTimerStore } from "@/features/rest-timer/store";
import { DEFAULT_REST_SEC } from "@/lib/data/users";
import { EMPTY, cn } from "@/lib/cn";
import { format } from "date-fns";
import type { SetType } from "@/lib/schemas/common";
import type { SessionExercise, SetSnapshot, WorkoutSet } from "@/lib/schemas/session";
import { formatClock } from "@/lib/timer";
import { toast } from "@/lib/toast";
import { prefillRow } from "@/lib/workout/prefill";
import { suggest, type Suggestion } from "@/lib/overload/suggest";
import { setsForSlot, toSnapshot } from "@/lib/workout/session";
import { SetOptionsSheet, type SetOptionsTarget } from "./SetOptionsSheet";
import { useWorkoutStore } from "./store";
import { SuggestionChips } from "./SuggestionChips";

const TYPE_LETTER: Record<SetType, string | null> = {
  warmup: "W",
  working: null,
  drop: "D",
  failure: "F",
};

export interface RowEdit {
  weight?: string;
  reps?: string;
  type?: SetType;
  rpe?: number | null;
  note?: string;
}

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
const parseNum = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")));

export function SlotCard({
  slot,
  handle,
  nextSlotName,
  onOpenMenu,
}: {
  slot: SessionExercise;
  handle: ReactNode;
  nextSlotName: string | null;
  onOpenMenu: () => void;
}) {
  const exercise = useExercisesStore((s) => s.byId.get(slot.exerciseId));
  const defaultRest = useAuthStore((s) => s.profile?.defaultRestSec ?? DEFAULT_REST_SEC);
  const slots = useWorkoutStore((s) => s.session?.exercises ?? EMPTY);
  const allSets = useWorkoutStore((s) => s.sets);
  const last = useWorkoutStore((s) => s.lastSets[slot.exerciseId]);
  const dismissed = useWorkoutStore((s) => s.dismissed[slot.key]);
  const { completeSet, updateSet, removeSet, updateSlot, dismissSuggestion } =
    useWorkoutStore.getState();
  const startTimer = useRestTimerStore((s) => s.start);

  const [edits, setEdits] = useState<Record<number, RowEdit>>({});
  const [doneEdits, setDoneEdits] = useState<Record<string, { weight?: string; reps?: string }>>(
    {},
  );
  const [options, setOptions] = useState<SetOptionsTarget | null>(null);

  const name = exercise?.name ?? slot.exerciseId;
  const done = setsForSlot(allSets, slot, slots);
  const doneSnapshots: SetSnapshot[] = done.map(toSnapshot);
  const rowCount = Math.max(slot.targetSets, done.length);
  const restSec = slot.restSec ?? exercise?.restSec ?? defaultRest;
  const lastSets = last?.sets ?? null;

  const suggestions: Suggestion[] = last
    ? suggest({
        lastSets: last.sets,
        repMin: slot.repMin,
        repMax: slot.repMax,
        incrementKg: exercise?.incrementKg ?? 0,
        history: last.history,
      }).filter((sg) => !dismissed?.includes(sg.kind))
    : [];

  /** Fill not-yet-logged rows from a suggestion (user-initiated; never automatic). */
  function applySuggestion(sg: Suggestion) {
    const pending = Array.from({ length: rowCount }, (_, i) => i).filter((i) => i >= done.length);
    setEdits((all) => {
      const next = { ...all };
      for (const i of pending) {
        if (pendingValues(i).type !== "working") continue;
        if (sg.kind === "increase-weight") {
          next[i] = { ...next[i], weight: String(sg.weightKg), reps: String(sg.reps) };
        } else if (sg.kind === "repeat" || sg.kind === "deload") {
          next[i] = { ...next[i], weight: String(sg.weightKg) };
        }
      }
      if (sg.kind === "add-rep" && sg.setIndex >= done.length) {
        next[sg.setIndex] = {
          ...next[sg.setIndex],
          weight: String(sg.weightKg),
          reps: String(sg.reps),
        };
      }
      return next;
    });
    dismissSuggestion(slot.key, sg.kind);
    toast.info("Suggestion applied to the remaining sets — adjust anything before you log it.");
  }

  function pendingValues(index: number) {
    const pre = prefillRow(index, doneSnapshots, lastSets, slot.repMin);
    const e = edits[index] ?? {};
    return {
      weight: e.weight ?? fmt(pre.weightKg),
      reps: e.reps ?? fmt(pre.reps),
      type: e.type ?? pre.type,
      rpe: e.rpe ?? null,
      note: e.note ?? "",
    };
  }

  function complete(index: number) {
    const v = pendingValues(index);
    const bodyweight = exercise?.equipment === "bodyweight" || exercise?.equipment === "band";
    const weightKg = v.weight.trim() === "" && bodyweight ? 0 : parseNum(v.weight);
    const reps = parseNum(v.reps);
    if (!Number.isFinite(weightKg) || weightKg < 0)
      return toast.error(`Enter the weight for ${name}.`);
    if (!Number.isInteger(reps) || reps <= 0) return toast.error(`Enter the reps for ${name}.`);
    primeAudio();
    const { rest } = completeSet(slot.key, {
      weightKg,
      reps,
      type: v.type,
      rpe: v.rpe,
      note: v.note,
    });
    setEdits((all) => {
      const next = { ...all };
      delete next[index];
      return next;
    });
    if (rest && restSec > 0) {
      const moreHere = rowCount - (done.length + 1) > 0;
      startTimer(restSec, moreHere ? name : (nextSlotName ?? "Finish workout"));
    }
  }

  function commitDone(set: WorkoutSet) {
    const e = doneEdits[set.id];
    if (!e) return;
    const weightKg = e.weight !== undefined ? parseNum(e.weight) : set.weightKg;
    const reps = e.reps !== undefined ? parseNum(e.reps) : set.reps;
    setDoneEdits((all) => {
      const next = { ...all };
      delete next[set.id];
      return next;
    });
    if (!Number.isFinite(weightKg) || weightKg < 0 || !Number.isInteger(reps) || reps <= 0) {
      return toast.error("That set wasn't changed — enter a valid weight and reps.");
    }
    if (weightKg !== set.weightKg || reps !== set.reps) updateSet(set.id, { weightKg, reps });
  }

  let workingNumber = 0;
  const rowLabel = (type: SetType) => TYPE_LETTER[type] ?? String(++workingNumber);

  return (
    <article
      aria-label={name}
      className={cn(
        "rounded-2xl border border-border bg-surface p-3",
        slot.supersetGroup && "border-l-4 border-l-accent",
      )}
    >
      <header className="flex items-start gap-1">
        {handle}
        <div className="min-w-0 flex-1 py-1">
          <h2 className="truncate text-lg leading-tight font-semibold">{name}</h2>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <span className="tabular">
              {slot.targetSets} × {slot.repMin}–{slot.repMax}
            </span>
            <span aria-hidden>·</span>
            <span className="tabular">Rest {formatClock(restSec)}</span>
            {slot.supersetGroup ? (
              <Badge className="gap-1">
                <Link2 aria-hidden className="size-3" /> Superset {slot.supersetGroup}
              </Badge>
            ) : null}
          </p>
        </div>
        <IconButton label={`${name} options`} onClick={onOpenMenu}>
          <MoreVertical aria-hidden />
        </IconButton>
      </header>

      {last ? (
        <p className="mt-1 mb-2 px-1 text-sm text-muted">
          <span className="font-semibold">Last time</span> ·{" "}
          {format(new Date(`${last.date}T12:00:00`), "d MMM")}:{" "}
          <span className="tabular">
            {last.sets
              .filter((s) => s.type !== "warmup")
              .map((s) => `${s.weightKg}×${s.reps}`)
              .join(", ")}
          </span>
        </p>
      ) : last === null ? (
        <p className="mt-1 mb-2 px-1 text-sm text-muted">First time — pick a comfortable weight.</p>
      ) : (
        <div className="mb-2" />
      )}

      <SuggestionChips
        suggestions={suggestions}
        onApply={applySuggestion}
        onDismiss={(sg) => dismissSuggestion(slot.key, sg.kind)}
      />

      <div role="table" aria-label={`${name} sets`} className="flex flex-col gap-1.5">
        <div
          role="row"
          className="grid grid-cols-[2.75rem_1fr_4.75rem_4rem_3rem] items-center gap-1.5 px-1 text-xs font-semibold tracking-wider text-muted uppercase"
        >
          <span role="columnheader" className="text-center">
            Set
          </span>
          <span role="columnheader">Previous</span>
          <span role="columnheader" className="text-center">
            kg
          </span>
          <span role="columnheader" className="text-center">
            Reps
          </span>
          <span role="columnheader" className="sr-only">
            Done
          </span>
        </div>

        {Array.from({ length: rowCount }, (_, i) => {
          const setDone = done[i];
          const prev = lastSets?.[i];
          const prevText = prev ? `${prev.weightKg}×${prev.reps}` : "—";

          if (setDone) {
            const e = doneEdits[setDone.id] ?? {};
            const label = rowLabel(setDone.type);
            return (
              <div
                role="row"
                key={setDone.id}
                className="grid grid-cols-[2.75rem_1fr_4.75rem_4rem_3rem] items-center gap-1.5 rounded-xl bg-accent-soft p-1"
              >
                <SetButton
                  label={label}
                  name={`Set ${i + 1} options`}
                  onClick={() => setOptions({ kind: "done", set: setDone })}
                />
                <span className="tabular truncate text-sm text-muted">{prevText}</span>
                <RowInput
                  ariaLabel={`Set ${i + 1} weight in kg`}
                  decimal
                  value={e.weight ?? fmt(setDone.weightKg)}
                  onChange={(weight) =>
                    setDoneEdits((all) => ({
                      ...all,
                      [setDone.id]: { ...all[setDone.id], weight },
                    }))
                  }
                  onBlur={() => commitDone(setDone)}
                />
                <RowInput
                  ariaLabel={`Set ${i + 1} reps`}
                  value={e.reps ?? fmt(setDone.reps)}
                  onChange={(reps) =>
                    setDoneEdits((all) => ({ ...all, [setDone.id]: { ...all[setDone.id], reps } }))
                  }
                  onBlur={() => commitDone(setDone)}
                />
                <button
                  type="button"
                  aria-label={`Set ${i + 1} done — tap to undo`}
                  aria-pressed
                  onClick={() => removeSet(setDone.id)}
                  className="inline-flex size-12 items-center justify-center rounded-xl bg-accent text-accent-fg transition-colors hover:bg-accent-strong"
                >
                  <Check aria-hidden className="size-6" strokeWidth={3} />
                </button>
              </div>
            );
          }

          const v = pendingValues(i);
          const label = rowLabel(v.type);
          return (
            <div
              role="row"
              key={`p${i}`}
              className="grid grid-cols-[2.75rem_1fr_4.75rem_4rem_3rem] items-center gap-1.5 p-1"
            >
              <SetButton
                label={label}
                name={`Set ${i + 1} options`}
                onClick={() => setOptions({ kind: "pending", index: i })}
              />
              <span className="tabular truncate text-sm text-muted">{prevText}</span>
              <RowInput
                ariaLabel={`Set ${i + 1} weight in kg`}
                decimal
                value={v.weight}
                placeholder="kg"
                onChange={(weight) => setEdits((all) => ({ ...all, [i]: { ...all[i], weight } }))}
              />
              <RowInput
                ariaLabel={`Set ${i + 1} reps`}
                value={v.reps}
                placeholder="reps"
                onChange={(reps) => setEdits((all) => ({ ...all, [i]: { ...all[i], reps } }))}
              />
              <button
                type="button"
                aria-label={`Complete set ${i + 1}`}
                aria-pressed={false}
                onClick={() => complete(i)}
                className="inline-flex size-12 items-center justify-center rounded-xl border-2 border-border-strong text-muted transition-colors hover:border-accent hover:text-accent active:bg-accent-soft"
              >
                <Check aria-hidden className="size-6" strokeWidth={3} />
              </button>
            </div>
          );
        })}
      </div>

      <Button
        variant="ghost"
        block
        className="mt-1"
        icon={<Plus aria-hidden />}
        onClick={() => updateSlot(slot.key, { targetSets: Math.min(20, rowCount + 1) })}
      >
        Add set
      </Button>

      <SetOptionsSheet
        target={options}
        exerciseName={name}
        pendingValues={options?.kind === "pending" ? pendingValues(options.index) : null}
        onClose={() => setOptions(null)}
        onSavePending={(index, patch) =>
          setEdits((all) => ({ ...all, [index]: { ...all[index], ...patch } }))
        }
        onRemovePending={(index) => {
          setEdits((all) => {
            const next = { ...all };
            delete next[index];
            return next;
          });
          updateSlot(slot.key, { targetSets: Math.max(done.length, rowCount - 1) });
        }}
        onSaveDone={(set, patch) => updateSet(set.id, patch)}
        onDeleteDone={(set) => removeSet(set.id)}
      />
    </article>
  );
}

function SetButton({ label, name, onClick }: { label: string; name: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={name}
      onClick={onClick}
      className="tabular inline-flex h-11 items-center justify-center rounded-lg font-display text-lg font-semibold text-fg transition-colors hover:bg-surface-2 active:bg-surface-3"
    >
      {label}
    </button>
  );
}

function RowInput({
  ariaLabel,
  value,
  onChange,
  onBlur,
  decimal,
  placeholder,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  decimal?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      aria-label={ariaLabel}
      inputMode={decimal ? "decimal" : "numeric"}
      enterKeyHint="done"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onFocus={(e) => e.currentTarget.select()}
      className="tabular h-11 w-full rounded-lg border border-border-strong bg-surface-2 text-center font-display text-xl font-semibold transition-colors placeholder:text-sm placeholder:font-normal placeholder:text-muted focus-visible:border-accent"
    />
  );
}
