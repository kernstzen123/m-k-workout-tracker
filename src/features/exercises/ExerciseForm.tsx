"use client";

import { Archive, ArchiveRestore } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { SelectField, TextField } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { createExercise, setExerciseArchived, updateExercise } from "@/lib/data/exercises";
import { defaultIncrement } from "@/lib/exerciseDefaults";
import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  MUSCLES,
  MUSCLE_LABELS,
  type Equipment,
  type Muscle,
} from "@/lib/schemas/common";
import { exerciseInputSchema, type Exercise } from "@/lib/schemas/exercise";
import { toast } from "@/lib/toast";
import { useExercisesStore } from "./store";

interface Draft {
  name: string;
  muscle: Muscle;
  secondary: Muscle[];
  equipment: Equipment;
  type: "strength" | "cardio";
  repMin: string;
  repMax: string;
  restSec: string;
  incrementKg: string;
}

const NEW_DRAFT: Draft = {
  name: "",
  muscle: "chest",
  secondary: [],
  equipment: "barbell",
  type: "strength",
  repMin: "8",
  repMax: "12",
  restSec: "90",
  incrementKg: "2.5",
};

function toDraft(e: Exercise): Draft {
  return {
    name: e.name,
    muscle: e.muscle,
    secondary: e.secondary,
    equipment: e.equipment,
    type: e.type,
    repMin: String(e.repMin),
    repMax: String(e.repMax),
    restSec: String(e.restSec),
    incrementKg: String(e.incrementKg),
  };
}

const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")));

export interface ExerciseFormProps {
  open: boolean;
  /** Exercise to edit, or null to create a new one. */
  exercise: Exercise | null;
  onClose: () => void;
}

export function ExerciseForm({ open, exercise, onClose }: ExerciseFormProps) {
  return (
    <Sheet open={open} onClose={onClose} title={exercise ? "Edit exercise" : "New exercise"}>
      {/* Remount per exercise so the draft resets. */}
      {open ? <FormBody key={exercise?.id ?? "new"} exercise={exercise} onDone={onClose} /> : null}
    </Sheet>
  );
}

function FormBody({ exercise, onDone }: { exercise: Exercise | null; onDone: () => void }) {
  const exercises = useExercisesStore((s) => s.exercises);
  const [draft, setDraft] = useState<Draft>(() => (exercise ? toDraft(exercise) : NEW_DRAFT));
  const [incrementTouched, setIncrementTouched] = useState(Boolean(exercise));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      if (!incrementTouched && (key === "muscle" || key === "equipment")) {
        next.incrementKg = String(defaultIncrement(next.muscle, next.equipment));
      }
      return next;
    });
  }

  function toggleSecondary(m: Muscle) {
    update(
      "secondary",
      draft.secondary.includes(m)
        ? draft.secondary.filter((x) => x !== m)
        : [...draft.secondary, m],
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const cardio = draft.type === "cardio";
    const result = exerciseInputSchema.safeParse({
      ...draft,
      secondary: draft.secondary.filter((m) => m !== draft.muscle),
      repMin: cardio ? 0 : num(draft.repMin),
      repMax: cardio ? 0 : num(draft.repMax),
      restSec: cardio ? 0 : num(draft.restSec),
      incrementKg: cardio ? 0 : num(draft.incrementKg),
    });
    const nextErrors: Record<string, string> = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "form");
        nextErrors[key] ??= issue.message.startsWith("Invalid input")
          ? "Enter a number"
          : issue.message;
      }
    }
    const nameTaken = exercises.some(
      (x) => x.id !== exercise?.id && x.name.toLowerCase() === draft.name.trim().toLowerCase(),
    );
    if (nameTaken) nextErrors.name = "An exercise with this name already exists.";
    setErrors(nextErrors);
    if (!result.success || nameTaken) return;

    if (exercise) {
      updateExercise(exercise, result.data);
      toast.success("Exercise updated.");
    } else {
      createExercise(result.data, new Set(exercises.map((x) => x.id)));
      toast.success("Exercise added.");
    }
    onDone();
  }

  function onToggleArchive() {
    if (!exercise) return;
    setExerciseArchived(exercise.id, !exercise.archived);
    toast.success(exercise.archived ? "Exercise restored." : "Exercise archived. History is kept.");
    onDone();
  }

  const muscleOptions = MUSCLES.map((m) => ({ value: m, label: MUSCLE_LABELS[m] }));
  const equipmentOptions = EQUIPMENT.map((q) => ({ value: q, label: EQUIPMENT_LABELS[q] }));

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <TextField
        label="Name"
        value={draft.name}
        onChange={(e) => update("name", e.target.value)}
        error={errors.name}
        autoComplete="off"
        maxLength={80}
      />

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Primary muscle"
          options={muscleOptions}
          value={draft.muscle}
          onChange={(e) => update("muscle", e.target.value as Muscle)}
        />
        <SelectField
          label="Equipment"
          options={equipmentOptions}
          value={draft.equipment}
          onChange={(e) => update("equipment", e.target.value as Equipment)}
        />
      </div>

      <SelectField
        label="Type"
        options={[
          { value: "strength", label: "Strength (sets × reps)" },
          { value: "cardio", label: "Cardio (minutes)" },
        ]}
        value={draft.type}
        onChange={(e) => update("type", e.target.value as Draft["type"])}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-muted">Secondary muscles</legend>
        <div className="flex flex-wrap gap-2">
          {MUSCLES.filter((m) => m !== draft.muscle && m !== "cardio").map((m) => (
            <Chip key={m} selected={draft.secondary.includes(m)} onClick={() => toggleSecondary(m)}>
              {MUSCLE_LABELS[m]}
            </Chip>
          ))}
        </div>
        {errors.secondary ? <p className="text-sm text-danger">{errors.secondary}</p> : null}
      </fieldset>

      {draft.type === "strength" ? (
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Min reps"
            inputMode="numeric"
            value={draft.repMin}
            onChange={(e) => update("repMin", e.target.value)}
            error={errors.repMin}
          />
          <TextField
            label="Max reps"
            inputMode="numeric"
            value={draft.repMax}
            onChange={(e) => update("repMax", e.target.value)}
            error={errors.repMax}
          />
          <TextField
            label="Rest (seconds)"
            inputMode="numeric"
            value={draft.restSec}
            onChange={(e) => update("restSec", e.target.value)}
            error={errors.restSec}
          />
          <TextField
            label="Increment (kg)"
            inputMode="decimal"
            value={draft.incrementKg}
            onChange={(e) => {
              setIncrementTouched(true);
              update("incrementKg", e.target.value);
            }}
            error={errors.incrementKg}
          />
        </div>
      ) : null}

      <Button type="submit" size="lg" block>
        {exercise ? "Save changes" : "Add exercise"}
      </Button>

      {exercise ? (
        <Button
          variant={exercise.archived ? "secondary" : "danger"}
          block
          onClick={onToggleArchive}
          icon={exercise.archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
        >
          {exercise.archived ? "Restore exercise" : "Archive exercise"}
        </Button>
      ) : null}
    </form>
  );
}
