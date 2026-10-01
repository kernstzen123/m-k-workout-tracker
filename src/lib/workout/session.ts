import type { ProgramDay } from "@/lib/schemas/program";
import type {
  LastSetsDoc,
  SessionDoc,
  SessionExercise,
  SetSnapshot,
  WorkoutSet,
} from "@/lib/schemas/session";
import { buildLastSets, totalVolume } from "./summary";

export function newSlotKey(): string {
  return `s${Math.random().toString(36).slice(2, 9)}`;
}

/** Snapshot a program day into session slots (so later program edits never change history). */
export function slotsFromDay(
  day: ProgramDay,
  keyGen: () => string = newSlotKey,
): SessionExercise[] {
  return day.items.map((item) => ({
    key: keyGen(),
    exerciseId: item.exerciseId,
    targetSets: item.durationMin ? 1 : item.sets,
    repMin: item.repMin,
    repMax: item.repMax,
    ...(item.supersetGroup ? { supersetGroup: item.supersetGroup } : {}),
    ...(item.durationMin ? { durationMin: item.durationMin } : {}),
  }));
}

/** Completed sets for a slot, in order. Sets without a slot key match the first slot of their exercise. */
export function setsForSlot(
  sets: readonly WorkoutSet[],
  slot: SessionExercise,
  slots: readonly SessionExercise[],
): WorkoutSet[] {
  const firstSlotForExercise = slots.find((s) => s.exerciseId === slot.exerciseId)?.key;
  return sets
    .filter((s) =>
      s.slotKey
        ? s.slotKey === slot.key
        : s.exerciseId === slot.exerciseId && firstSlotForExercise === slot.key,
    )
    .sort((a, b) => a.order - b.order);
}

/**
 * Should the rest timer start after a set in this slot? In a superset you go straight to the
 * next exercise of the group; rest only after the last exercise of the group.
 */
export function restsAfterSet(slots: readonly SessionExercise[], slotKey: string): boolean {
  const index = slots.findIndex((s) => s.key === slotKey);
  const slot = slots[index];
  if (!slot?.supersetGroup) return true;
  const next = slots[index + 1];
  return next?.supersetGroup !== slot.supersetGroup;
}

export function toSnapshot(set: WorkoutSet): SetSnapshot {
  return { type: set.type, weightKg: set.weightKg, reps: set.reps, rpe: set.rpe ?? null };
}

export interface FinishPayload {
  session: SessionDoc;
  lastSets: Record<string, LastSetsDoc>;
}

/** Everything written when a workout is finished. */
export function buildFinish(
  sessionId: string,
  session: SessionDoc,
  sets: readonly WorkoutSet[],
  previousLastSets: Readonly<Record<string, LastSetsDoc | null | undefined>>,
  notes: string,
  now: number,
): FinishPayload {
  const slots = session.exercises ?? [];
  // Group sets per exercise in session order (an exercise may appear in two slots).
  const byExercise = new Map<string, SetSnapshot[]>();
  for (const slot of slots) {
    const slotSets = setsForSlot(sets, slot, slots).map(toSnapshot);
    if (slotSets.length === 0) continue;
    byExercise.set(slot.exerciseId, [...(byExercise.get(slot.exerciseId) ?? []), ...slotSets]);
  }

  const lastSets: Record<string, LastSetsDoc> = {};
  for (const [exerciseId, exerciseSets] of byExercise) {
    lastSets[exerciseId] = buildLastSets(
      previousLastSets[exerciseId] ?? null,
      sessionId,
      session.date,
      exerciseSets,
      now,
    );
  }

  return {
    session: {
      ...session,
      status: "done",
      finishedAt: now,
      durationSec: Math.min(86_400, Math.max(0, Math.round((now - session.startedAt) / 1000))),
      totalVolume: totalVolume(sets),
      notes: notes.trim().slice(0, 2000),
      updatedAt: now,
    },
    lastSets,
  };
}
