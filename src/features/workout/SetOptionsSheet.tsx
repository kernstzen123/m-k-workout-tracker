"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { TextField } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import type { SetType } from "@/lib/schemas/common";
import type { SetDoc, WorkoutSet } from "@/lib/schemas/session";

export type SetOptionsTarget =
  { kind: "done"; set: WorkoutSet } | { kind: "pending"; index: number };

const TYPES: Array<{ value: SetType; label: string }> = [
  { value: "warmup", label: "Warm-up" },
  { value: "working", label: "Working" },
  { value: "drop", label: "Drop set" },
  { value: "failure", label: "To failure" },
];
const RPES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

interface Values {
  type: SetType;
  rpe: number | null;
  note: string;
}

export function SetOptionsSheet({
  target,
  exerciseName,
  pendingValues,
  onClose,
  onSavePending,
  onRemovePending,
  onSaveDone,
  onDeleteDone,
}: {
  target: SetOptionsTarget | null;
  exerciseName: string;
  pendingValues: Values | null;
  onClose: () => void;
  onSavePending: (index: number, patch: Partial<Values>) => void;
  onRemovePending: (index: number) => void;
  onSaveDone: (set: WorkoutSet, patch: Partial<SetDoc>) => void;
  onDeleteDone: (set: WorkoutSet) => void;
}) {
  const initial: Values | null =
    target?.kind === "done"
      ? { type: target.set.type, rpe: target.set.rpe ?? null, note: target.set.note ?? "" }
      : pendingValues;
  const key = target ? (target.kind === "done" ? target.set.id : `p${target.index}`) : "none";

  return (
    <Sheet open={target !== null} onClose={onClose} title={`${exerciseName} · set options`}>
      {target && initial ? (
        <Body
          key={key}
          initial={initial}
          isDone={target.kind === "done"}
          onSave={(v) => {
            if (target.kind === "done") {
              onSaveDone(target.set, { type: v.type, rpe: v.rpe, note: v.note.trim() || null });
            } else {
              onSavePending(target.index, v);
            }
            onClose();
          }}
          onRemove={() => {
            if (target.kind === "done") onDeleteDone(target.set);
            else onRemovePending(target.index);
            onClose();
          }}
        />
      ) : null}
    </Sheet>
  );
}

function Body({
  initial,
  isDone,
  onSave,
  onRemove,
}: {
  initial: Values;
  isDone: boolean;
  onSave: (v: Values) => void;
  onRemove: () => void;
}) {
  const [v, setV] = useState(initial);
  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className="eyebrow mb-2">Set type</legend>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <Chip
              key={t.value}
              selected={v.type === t.value}
              onClick={() => setV({ ...v, type: t.value })}
            >
              {t.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-2">RPE (optional)</legend>
        <div className="flex flex-wrap gap-2">
          <Chip selected={v.rpe === null} onClick={() => setV({ ...v, rpe: null })}>
            None
          </Chip>
          {RPES.map((r) => (
            <Chip key={r} selected={v.rpe === r} onClick={() => setV({ ...v, rpe: r })}>
              {r}
            </Chip>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">10 = nothing left · 8 = two reps in reserve.</p>
      </fieldset>

      <TextField
        label="Note"
        value={v.note}
        onChange={(e) => setV({ ...v, note: e.target.value })}
        maxLength={500}
        placeholder="e.g. paused reps, belt"
      />

      <div className="grid grid-cols-2 gap-3">
        <Button variant="danger" icon={<Trash2 aria-hidden />} onClick={onRemove}>
          {isDone ? "Delete set" : "Remove row"}
        </Button>
        <Button onClick={() => onSave(v)}>Save</Button>
      </div>
    </div>
  );
}
