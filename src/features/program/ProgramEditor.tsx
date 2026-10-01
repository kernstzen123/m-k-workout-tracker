"use client";

import { formatDistanceToNow } from "date-fns";
import { ArrowDown, ArrowUp, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SelectField, TextField } from "@/components/ui/Field";
import { Card, PageHeader } from "@/components/ui/Page";
import { SortableList, arrayMove } from "@/components/ui/SortableList";
import { MiniNumber, Stepper } from "@/components/ui/Stepper";
import { useAuthStore } from "@/features/auth/store";
import { ExercisePicker } from "@/features/exercises/ExercisePicker";
import { useExercisesStore } from "@/features/exercises/store";
import { ProgramConflictError, saveProgram } from "@/lib/data/program";
import { slugify } from "@/lib/data/util";
import { reportError } from "@/lib/monitoring";
import {
  SUPERSET_GROUPS,
  programDaySchema,
  type Program,
  type ProgramDay,
  type ProgramItem,
} from "@/lib/schemas/program";
import { toast } from "@/lib/toast";
import { useEditorName } from "./useEditorName";
import { useProgramStore } from "./store";

type EditorItem = ProgramItem & { uid: string };
type EditorDay = Omit<ProgramDay, "items"> & { items: EditorItem[] };

const uid = () => Math.random().toString(36).slice(2, 10);
const toEditor = (days: ProgramDay[]): EditorDay[] =>
  days.map((d) => ({ ...d, items: d.items.map((i) => ({ ...i, uid: uid() })) }));
const fromEditor = (days: EditorDay[]): ProgramDay[] =>
  days.map((d) => ({ ...d, items: d.items.map(({ uid: _u, ...item }) => item) }));

export function ProgramEditor({ program, onDone }: { program: Program; onDone: () => void }) {
  const me = useAuthStore((s) => s.user?.uid);
  const live = useProgramStore((s) => s.program);
  const [name, setName] = useState(program.name);
  const [days, setDays] = useState<EditorDay[]>(() => toEditor(program.days));
  const [pickerDay, setPickerDay] = useState<number | null>(null);
  const [removeDay, setRemoveDay] = useState<number | null>(null);
  const [conflict, setConflict] = useState<Program | null>(null);
  const [saving, setSaving] = useState(false);
  // Captured once: the live `program` prop moves on when the partner saves mid-edit.
  const [baseVersion] = useState(program.version);
  const partnerSaved = live && live.version !== baseVersion ? live : null;
  const partnerName = useEditorName(partnerSaved?.updatedBy ?? conflict?.updatedBy);

  const updateDay = (i: number, patch: Partial<EditorDay>) =>
    setDays((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const updateItem = (di: number, ii: number, patch: Partial<ProgramItem>) =>
    setDays((ds) =>
      ds.map((d, j) =>
        j === di
          ? { ...d, items: d.items.map((it, k) => (k === ii ? { ...it, ...patch } : it)) }
          : d,
      ),
    );
  const moveItem = (di: number, from: number, to: number) => {
    if (to < 0 || to >= (days[di]?.items.length ?? 0)) return;
    updateDay(di, { items: arrayMove(days[di]!.items, from, to) });
  };
  const moveDay = (from: number, to: number) => {
    if (to < 0 || to >= days.length) return;
    setDays((ds) => arrayMove(ds, from, to));
  };

  function addDay() {
    const n = days.length + 1;
    setDays((ds) => [
      ...ds,
      { dayId: `${slugify(`day ${n}`)}-${uid().slice(0, 4)}`, name: `Day ${n}`, items: [] },
    ]);
  }

  async function save(force = false) {
    const cleanDays = fromEditor(days);
    for (const day of cleanDays) {
      const result = programDaySchema.safeParse(day);
      if (!result.success) {
        toast.error(`${day.name || "A day"}: ${result.error.issues[0]?.message ?? "invalid"}`);
        return;
      }
    }
    if (!name.trim()) return toast.error("Give the program a name.");
    if (cleanDays.length === 0) return toast.error("Keep at least one day.");
    if (!me) return;
    if (!force && partnerSaved) {
      setConflict(partnerSaved);
      return;
    }
    setSaving(true);
    try {
      const result = await saveProgram({ name, days: cleanDays, baseVersion, uid: me, force });
      toast.success(
        result === "queued"
          ? "Saved offline — it will sync when you're back online."
          : "Program saved for both of you.",
      );
      onDone();
    } catch (error) {
      if (error instanceof ProgramConflictError) {
        setConflict(error.current);
      } else {
        reportError(error, { where: "saveProgram" });
        toast.error("Couldn't save the program. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow={`Editing · v${baseVersion}`} title="Edit program" />

      {partnerSaved ? (
        <div
          role="alert"
          className="mb-4 flex gap-3 rounded-2xl border border-warning/50 bg-warning/10 p-3 text-sm"
        >
          <TriangleAlert aria-hidden className="size-5 shrink-0 text-warning" />
          <p>
            {partnerName} saved a newer version (v{partnerSaved.version}){" "}
            {formatDistanceToNow(partnerSaved.updatedAt, { addSuffix: true })}. Saving will ask
            before overwriting it.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 pb-24">
        <TextField
          label="Program name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
        />

        {days.map((day, di) => (
          <Card key={day.dayId} className="flex flex-col gap-3">
            <div className="flex items-end gap-2">
              <TextField
                label={`Day ${di + 1} name`}
                value={day.name}
                onChange={(e) => updateDay(di, { name: e.target.value })}
                maxLength={40}
                className="flex-1"
              />
              <IconButton
                label={`Move ${day.name} up`}
                disabled={di === 0}
                onClick={() => moveDay(di, di - 1)}
              >
                <ArrowUp aria-hidden />
              </IconButton>
              <IconButton
                label={`Move ${day.name} down`}
                disabled={di === days.length - 1}
                onClick={() => moveDay(di, di + 1)}
              >
                <ArrowDown aria-hidden />
              </IconButton>
              <IconButton
                label={`Remove ${day.name}`}
                onClick={() => setRemoveDay(di)}
                disabled={days.length === 1}
              >
                <Trash2 aria-hidden className="text-danger" />
              </IconButton>
            </div>

            <SortableList
              items={day.items}
              getId={(it) => it.uid}
              getLabel={(it) => it.exerciseId}
              onMove={(from, to) => moveItem(di, from, to)}
              className="flex flex-col gap-2"
              renderItem={(item, ii, handle) => (
                <ItemEditor
                  item={item}
                  handle={handle}
                  isFirst={ii === 0}
                  isLast={ii === day.items.length - 1}
                  onChange={(patch) => updateItem(di, ii, patch)}
                  onMove={(dir) => moveItem(di, ii, ii + dir)}
                  onRemove={() => updateDay(di, { items: day.items.filter((_, k) => k !== ii) })}
                />
              )}
            />

            <Button
              variant="secondary"
              icon={<Plus aria-hidden />}
              onClick={() => setPickerDay(di)}
            >
              Add exercise
            </Button>
          </Card>
        ))}

        {days.length < 7 ? (
          <Button variant="ghost" icon={<Plus aria-hidden />} onClick={addDay}>
            Add day
          </Button>
        ) : null}
      </div>

      {/* Sticky action bar above the bottom navigation. */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto grid max-w-lg grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onDone} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save program"}
          </Button>
        </div>
      </div>

      <ExercisePicker
        open={pickerDay !== null}
        onClose={() => setPickerDay(null)}
        onPick={(exercise) => {
          if (pickerDay === null) return;
          const item: EditorItem =
            exercise.type === "cardio"
              ? {
                  uid: uid(),
                  exerciseId: exercise.id,
                  sets: 1,
                  repMin: 0,
                  repMax: 0,
                  durationMin: 15,
                }
              : {
                  uid: uid(),
                  exerciseId: exercise.id,
                  sets: 3,
                  repMin: exercise.repMin,
                  repMax: exercise.repMax,
                };
          updateDay(pickerDay, { items: [...(days[pickerDay]?.items ?? []), item] });
          setPickerDay(null);
        }}
      />

      <ConfirmDialog
        open={removeDay !== null}
        title="Remove day?"
        confirmLabel="Remove"
        destructive
        onCancel={() => setRemoveDay(null)}
        onConfirm={() => {
          setDays((ds) => ds.filter((_, i) => i !== removeDay));
          setRemoveDay(null);
        }}
      >
        Remove <strong>{removeDay !== null ? days[removeDay]?.name : ""}</strong> from the program?
        Past workouts on this day are kept.
      </ConfirmDialog>

      <ConfirmDialog
        open={conflict !== null}
        title="Program changed"
        confirmLabel="Overwrite"
        cancelLabel="Keep theirs"
        destructive
        onCancel={() => {
          setConflict(null);
          onDone();
        }}
        onConfirm={() => {
          setConflict(null);
          void save(true);
        }}
      >
        {partnerName ?? "Your partner"} saved version {conflict?.version}{" "}
        {conflict ? formatDistanceToNow(conflict.updatedAt, { addSuffix: true }) : ""} while you
        were editing. Overwrite it with your changes, or discard yours and keep theirs?
      </ConfirmDialog>
    </>
  );
}

function ItemEditor({
  item,
  handle,
  isFirst,
  isLast,
  onChange,
  onMove,
  onRemove,
}: {
  item: EditorItem;
  handle: ReactNode;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<ProgramItem>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const exercise = useExercisesStore((s) => s.byId.get(item.exerciseId));
  const name = exercise?.name ?? item.exerciseId;
  const isCardio = exercise?.type === "cardio" || item.durationMin !== undefined;
  const int = (v: string) =>
    v.trim() === "" ? 0 : Math.max(0, Math.min(180, Math.round(Number(v) || 0)));

  return (
    <div className="rounded-xl border border-border bg-surface-2 p-2">
      <div className="flex items-center gap-1">
        {handle}
        <span className="line-clamp-2 min-w-0 flex-1 leading-snug font-semibold">{name}</span>
        <IconButton
          label={`Move ${name} up`}
          disabled={isFirst}
          onClick={() => onMove(-1)}
          className="size-11"
        >
          <ArrowUp aria-hidden className="size-5" />
        </IconButton>
        <IconButton
          label={`Move ${name} down`}
          disabled={isLast}
          onClick={() => onMove(1)}
          className="size-11"
        >
          <ArrowDown aria-hidden className="size-5" />
        </IconButton>
      </div>
      {isCardio ? (
        <div className="flex items-end gap-3 pt-2">
          <MiniNumber
            label="Minutes"
            value={String(item.durationMin ?? 15)}
            onChange={(v) => onChange({ durationMin: Math.max(1, int(v)) })}
            className="w-20"
          />
          <IconButton label={`Remove ${name}`} onClick={onRemove} className="ml-auto size-11">
            <Trash2 aria-hidden className="size-5 text-danger" />
          </IconButton>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2 pt-2">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-semibold text-muted">Sets</span>
            <Stepper
              label={`${name} sets`}
              value={item.sets}
              min={1}
              max={20}
              onChange={(sets) => onChange({ sets })}
            />
          </div>
          <div className="flex items-end gap-1">
            <MiniNumber
              label="Min reps"
              value={String(item.repMin)}
              onChange={(v) => onChange({ repMin: int(v) })}
              className="w-14"
            />
            <span aria-hidden className="pb-3 text-muted">
              –
            </span>
            <MiniNumber
              label="Max reps"
              value={String(item.repMax)}
              onChange={(v) => onChange({ repMax: int(v) })}
              className="w-14"
            />
          </div>
          <SelectField
            label="Superset"
            className="w-24"
            value={item.supersetGroup ?? ""}
            onChange={(e) => onChange({ supersetGroup: e.target.value || undefined })}
            options={[
              { value: "", label: "—" },
              ...SUPERSET_GROUPS.map((g) => ({ value: g, label: g })),
            ]}
          />
          <IconButton label={`Remove ${name}`} onClick={onRemove} className="ml-auto size-11">
            <Trash2 aria-hidden className="size-5 text-danger" />
          </IconButton>
        </div>
      )}
    </div>
  );
}
