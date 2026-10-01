"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, PageHeader } from "@/components/ui/Page";
import { SortableList, arrayMove } from "@/components/ui/SortableList";
import { ExercisePicker } from "@/features/exercises/ExercisePicker";
import { useExercisesStore } from "@/features/exercises/store";
import { useRestTimerStore } from "@/features/rest-timer/store";
import type { Exercise } from "@/lib/schemas/exercise";
import type { Session, SessionExercise } from "@/lib/schemas/session";
import { formatClock } from "@/lib/timer";
import { reportError } from "@/lib/monitoring";
import { toast } from "@/lib/toast";
import { setsForSlot } from "@/lib/workout/session";
import { CardioSlotCard } from "./CardioSlotCard";
import { FinishSheet } from "./FinishSheet";
import { SlotCard } from "./SlotCard";
import { SlotMenuSheet } from "./SlotMenuSheet";
import { useWorkoutStore } from "./store";

function Elapsed({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular">{formatClock((now - startedAt) / 1000)}</span>;
}

function slotDefaults(exercise: Exercise): Omit<SessionExercise, "key" | "exerciseId"> {
  return exercise.type === "cardio"
    ? { targetSets: 1, repMin: 0, repMax: 0, durationMin: 15 }
    : { targetSets: 3, repMin: exercise.repMin, repMax: exercise.repMax, durationMin: undefined };
}

export function ActiveWorkout({ session }: { session: Session }) {
  const router = useRouter();
  const byId = useExercisesStore((s) => s.byId);
  const sets = useWorkoutStore((s) => s.sets);
  const cardio = useWorkoutStore((s) => s.cardio);
  const { setSlots, addSlot, updateSlot, removeSlot, finish, discard } = useWorkoutStore.getState();
  const clearTimer = useRestTimerStore((s) => s.clear);

  const [picker, setPicker] = useState<{ mode: "add" } | { mode: "swap"; slotKey: string } | null>(
    null,
  );
  const [menuSlot, setMenuSlot] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const slots = session.exercises ?? [];
  const exerciseInfo = (id: string) => {
    const e = byId.get(id);
    return e ? { muscle: e.muscle, secondary: e.secondary } : undefined;
  };
  const nameOf = (slot: SessionExercise | undefined) =>
    slot ? (byId.get(slot.exerciseId)?.name ?? slot.exerciseId) : "";
  const menuIndex = slots.findIndex((s) => s.key === menuSlot);
  const menu = slots[menuIndex] ?? null;
  const slotHasSets = (slot: SessionExercise | null | undefined) =>
    slot ? setsForSlot(sets, slot, slots).length > 0 : false;

  function move(from: number, to: number) {
    if (to < 0 || to >= slots.length) return;
    setSlots(arrayMove(slots, from, to));
  }

  function onPick(exercise: Exercise) {
    if (picker?.mode === "swap") {
      updateSlot(picker.slotKey, { exerciseId: exercise.id, ...slotDefaults(exercise) });
      toast.success(`Swapped to ${exercise.name}.`);
    } else {
      addSlot(exercise.id, slotDefaults(exercise));
    }
    setPicker(null);
  }

  return (
    <>
      <PageHeader
        eyebrow={session.dayName ?? "Workout"}
        title="In progress"
        action={
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm font-semibold text-muted">
              <Elapsed startedAt={session.startedAt} />
            </span>
            <Button onClick={() => setFinishing(true)}>Finish</Button>
          </div>
        }
      />

      {slots.length === 0 ? (
        <EmptyState title="Empty workout">Add your first exercise to get going.</EmptyState>
      ) : (
        <SortableList
          items={slots}
          getId={(s) => s.key}
          getLabel={(s) => nameOf(s)}
          onMove={move}
          className="flex flex-col gap-3"
          renderItem={(slot, index, handle) => {
            const isCardio =
              slot.durationMin !== undefined || byId.get(slot.exerciseId)?.type === "cardio";
            return isCardio ? (
              <CardioSlotCard
                slot={slot}
                handle={handle}
                onOpenMenu={() => setMenuSlot(slot.key)}
              />
            ) : (
              <SlotCard
                slot={slot}
                handle={handle}
                nextSlotName={nameOf(slots[index + 1]) || null}
                onOpenMenu={() => setMenuSlot(slot.key)}
              />
            );
          }}
        />
      )}

      <div className="mt-4 flex flex-col gap-3 pb-28">
        <Button
          variant="secondary"
          size="lg"
          icon={<Plus aria-hidden />}
          onClick={() => setPicker({ mode: "add" })}
        >
          Add exercise
        </Button>
        <Button variant="ghost" className="text-danger" onClick={() => setConfirmDiscard(true)}>
          Discard workout
        </Button>
      </div>

      <ExercisePicker
        open={picker !== null}
        title={picker?.mode === "swap" ? "Swap exercise" : "Add exercise"}
        onClose={() => setPicker(null)}
        onPick={onPick}
      />

      <SlotMenuSheet
        slot={menu}
        name={nameOf(menu ?? undefined)}
        index={menuIndex}
        total={slots.length}
        hasSets={slotHasSets(menu)}
        onClose={() => setMenuSlot(null)}
        onMove={(dir) => {
          move(menuIndex, menuIndex + dir);
          setMenuSlot(null);
        }}
        onSwap={() => {
          if (menu) setPicker({ mode: "swap", slotKey: menu.key });
          setMenuSlot(null);
        }}
        onRemove={() => {
          if (menu && slotHasSets(menu)) setConfirmRemove(menu.key);
          else if (menu) removeSlot(menu.key);
          setMenuSlot(null);
        }}
        onSave={(patch) => {
          if (menu) updateSlot(menu.key, patch);
          setMenuSlot(null);
          toast.success("Rest time updated.");
        }}
      />

      <ConfirmDialog
        open={confirmRemove !== null}
        title="Remove exercise?"
        confirmLabel="Remove"
        destructive
        onCancel={() => setConfirmRemove(null)}
        onConfirm={() => {
          if (confirmRemove) removeSlot(confirmRemove);
          setConfirmRemove(null);
        }}
      >
        Its logged sets in this workout will be deleted too.
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard workout?"
        confirmLabel="Discard"
        destructive
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          clearTimer();
          void discard().then(() => {
            toast.info("Workout discarded.");
            router.push("/");
          });
        }}
      >
        All sets logged in this workout will be deleted. This can&apos;t be undone.
      </ConfirmDialog>

      {finishing ? (
        <FinishSheet
          open
          session={session}
          sets={sets}
          cardio={cardio}
          exerciseInfo={exerciseInfo}
          onClose={() => setFinishing(false)}
          onDiscard={async () => {
            clearTimer();
            await discard();
            setFinishing(false);
            router.push("/");
          }}
          onFinish={async (notes) => {
            clearTimer();
            const result = finish(notes, exerciseInfo);
            if (!result) return;
            // Navigate only once the finish is committed on this device (milliseconds; works offline).
            const durable = await result.saved;
            if (!durable)
              reportError(new Error("Finish not confirmed locally in time"), { where: "finish" });
            const prs = result.payload.prHits.length;
            toast.success(
              prs > 0
                ? `Workout saved — ${prs} new PR${prs === 1 ? "" : "s"}!`
                : "Workout saved. Nice work!",
            );
            setFinishing(false);
            router.push("/");
          }}
        />
      ) : null}
    </>
  );
}
