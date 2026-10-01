import { create } from "zustand";
import { addCardio, deleteCardio, subscribeSessionCardio } from "@/lib/data/cardio";
import { getLastSets } from "@/lib/data/lastSets";
import {
  createSession,
  deleteSet,
  discardSession,
  findDraftSession,
  finishSession,
  newSessionId,
  newSetId,
  subscribeSession,
  subscribeSets,
  updateSessionExercises,
  writeSet,
} from "@/lib/data/sessions";
import { toDayString } from "@/lib/dates";
import { reportError } from "@/lib/monitoring";
import type { SetType } from "@/lib/schemas/common";
import type { ProgramDay } from "@/lib/schemas/program";
import type {
  LastSetsDoc,
  Session,
  SessionExercise,
  SetDoc,
  WorkoutSet,
} from "@/lib/schemas/session";
import type { CardioEntry } from "@/lib/schemas/tracking";
import { actualRestSec } from "@/lib/timer";
import { toast } from "@/lib/toast";
import { getPrs } from "@/lib/data/prs";
import type { PrDoc } from "@/lib/schemas/stats";
import {
  buildFinish,
  newSlotKey,
  restsAfterSet,
  setsForSlot,
  slotsFromDay,
  type FinishInput,
  type FinishPayload,
} from "@/lib/workout/session";

export interface CompleteSetInput {
  weightKg: number;
  reps: number;
  type: SetType;
  rpe?: number | null;
  note?: string | null;
}

interface WorkoutState {
  uid: string | null;
  /** checking = looking for a draft to resume; none = no active workout. */
  status: "idle" | "checking" | "none" | "active";
  sessionId: string | null;
  session: Session | null;
  sets: WorkoutSet[];
  cardio: CardioEntry[];
  /** Last session per exercise: undefined = loading, null = never done. */
  lastSets: Record<string, LastSetsDoc | null | undefined>;
  /** Personal records per exercise: undefined = loading, null = none yet. */
  prs: Record<string, PrDoc | null | undefined>;
  /** Suggestion chips dismissed in this workout (slot key → suggestion kinds). */
  dismissed: Record<string, string[]>;
  dismissSuggestion: (slotKey: string, kind: string) => void;

  init: (uid: string) => () => void;
  start: (input: { day: ProgramDay | null; programVersion: number | null }) => void;

  completeSet: (slotKey: string, input: CompleteSetInput) => { rest: boolean };
  updateSet: (setId: string, patch: Partial<SetDoc>) => void;
  removeSet: (setId: string) => void;

  setSlots: (slots: SessionExercise[]) => void;
  addSlot: (exerciseId: string, defaults: Omit<SessionExercise, "key" | "exerciseId">) => void;
  updateSlot: (slotKey: string, patch: Partial<SessionExercise>) => void;
  removeSlot: (slotKey: string) => void;

  logCardio: (input: { type: string; durationMin: number }) => void;
  undoCardio: (entryId: string) => void;

  finish: (notes: string, exerciseInfo: FinishInput["exerciseInfo"]) => FinishPayload | null;
  discard: () => void;
}

let unsubscribers: Array<() => void> = [];
function detach() {
  for (const u of unsubscribers) u();
  unsubscribers = [];
}

const EMPTY = {
  sessionId: null,
  session: null,
  sets: [],
  cardio: [],
} satisfies Partial<WorkoutState>;

export const useWorkoutStore = create<WorkoutState>((set, get) => {
  function onError(where: string) {
    return (error: Error) => {
      reportError(error, { where });
      toast.error(
        "Lost connection to your workout data. Your sets are still saved on this device.",
      );
    };
  }

  function loadLastSets(exerciseIds: string[]) {
    const { uid, lastSets, prs } = get();
    if (!uid) return;
    for (const id of exerciseIds) {
      if (!(id in prs)) {
        set((s) => ({ prs: { ...s.prs, [id]: undefined } }));
        getPrs(uid, id)
          .then((doc) => set((s) => ({ prs: { ...s.prs, [id]: doc } })))
          .catch((error: unknown) => {
            reportError(error, { where: "getPrs", id });
            set((s) => ({ prs: { ...s.prs, [id]: null } }));
          });
      }
      if (id in lastSets) continue;
      set((s) => ({ lastSets: { ...s.lastSets, [id]: undefined } }));
      getLastSets(uid, id)
        .then((doc) => set((s) => ({ lastSets: { ...s.lastSets, [id]: doc } })))
        .catch((error: unknown) => {
          reportError(error, { where: "getLastSets", id });
          set((s) => ({ lastSets: { ...s.lastSets, [id]: null } }));
        });
    }
  }

  function attach(uid: string, sessionId: string) {
    detach();
    set({ status: "active", sessionId });
    unsubscribers.push(
      subscribeSession(
        uid,
        sessionId,
        (session) => {
          if (!session || session.status === "done") {
            // Finished or discarded (possibly on another device).
            detach();
            set({ ...EMPTY, status: "none" });
            return;
          }
          set({ session });
          loadLastSets((session.exercises ?? []).map((e) => e.exerciseId));
        },
        onError("subscribeSession"),
      ),
      subscribeSets(uid, sessionId, (sets) => set({ sets }), onError("subscribeSets")),
      subscribeSessionCardio(
        uid,
        sessionId,
        (cardio) => set({ cardio }),
        onError("subscribeCardio"),
      ),
    );
  }

  function writeSlots(slots: SessionExercise[]) {
    const { uid, sessionId, session } = get();
    if (!uid || !sessionId || !session) return;
    set({ session: { ...session, exercises: slots } });
    updateSessionExercises(uid, sessionId, slots);
  }

  function slots(): SessionExercise[] {
    return get().session?.exercises ?? [];
  }

  return {
    uid: null,
    status: "idle",
    ...EMPTY,
    lastSets: {},
    prs: {},
    dismissed: {},

    dismissSuggestion: (slotKey, kind) =>
      set((s) => ({
        dismissed: { ...s.dismissed, [slotKey]: [...(s.dismissed[slotKey] ?? []), kind] },
      })),

    init: (uid) => {
      set({ uid, status: "checking", lastSets: {}, prs: {} });
      let cancelled = false;
      findDraftSession(uid)
        .then((draft) => {
          if (cancelled || get().status === "active") return;
          if (draft) attach(uid, draft.id);
          else set({ status: "none" });
        })
        .catch((error: unknown) => {
          reportError(error, { where: "findDraftSession" });
          if (!cancelled && get().status !== "active") set({ status: "none" });
        });
      return () => {
        cancelled = true;
        detach();
        set({ ...EMPTY, status: "idle", uid: null, lastSets: {}, prs: {} });
      };
    },

    start: ({ day, programVersion }) => {
      const { uid } = get();
      if (!uid) return;
      const id = newSessionId(uid);
      const now = Date.now();
      const exercises = day ? slotsFromDay(day) : [];
      const session = {
        date: toDayString(now),
        dayId: day?.dayId ?? null,
        ...(day ? { dayName: day.name } : { dayName: "Workout" }),
        programVersion: day ? programVersion : null,
        exercises,
        startedAt: now,
        finishedAt: null,
        durationSec: 0,
        totalVolume: 0,
        notes: "",
        status: "draft" as const,
        updatedAt: now,
      };
      createSession(uid, id, session);
      set({ session: { ...session, id }, sets: [], cardio: [] });
      attach(uid, id);
      loadLastSets(exercises.map((e) => e.exerciseId));
    },

    completeSet: (slotKey, input) => {
      const { uid, sessionId, sets } = get();
      const all = slots();
      const slot = all.find((s) => s.key === slotKey);
      if (!uid || !sessionId || !slot) return { rest: false };
      const done = setsForSlot(sets, slot, all);
      const now = Date.now();
      const lastCompletedAt = sets.reduce<number | null>(
        (max, s) => (s.completedAt && (max === null || s.completedAt > max) ? s.completedAt : max),
        null,
      );
      const id = newSetId(uid, sessionId);
      const data: SetDoc = {
        exerciseId: slot.exerciseId,
        slotKey,
        order: done.length ? Math.max(...done.map((s) => s.order)) + 1 : 0,
        type: input.type,
        weightKg: input.weightKg,
        reps: input.reps,
        rpe: input.rpe ?? null,
        note: input.note?.trim() ? input.note.trim() : null,
        restSec: actualRestSec(lastCompletedAt, now),
        completedAt: now,
      };
      writeSet(uid, sessionId, id, data);
      // Optimistic: the listener confirms from the local cache almost immediately.
      set({ sets: [...sets, { ...data, id }] });
      return { rest: restsAfterSet(all, slotKey) };
    },

    updateSet: (setId, patch) => {
      const { uid, sessionId, sets } = get();
      const current = sets.find((s) => s.id === setId);
      if (!uid || !sessionId || !current) return;
      const { id: _id, ...rest } = { ...current, ...patch };
      writeSet(uid, sessionId, setId, rest);
      set({ sets: sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) });
    },

    removeSet: (setId) => {
      const { uid, sessionId, sets } = get();
      if (!uid || !sessionId) return;
      deleteSet(uid, sessionId, setId);
      set({ sets: sets.filter((s) => s.id !== setId) });
    },

    setSlots: (next) => writeSlots(next),

    addSlot: (exerciseId, defaults) => {
      writeSlots([...slots(), { key: newSlotKey(), exerciseId, ...defaults }]);
      loadLastSets([exerciseId]);
    },

    updateSlot: (slotKey, patch) => {
      writeSlots(slots().map((s) => (s.key === slotKey ? { ...s, ...patch } : s)));
      if (patch.exerciseId) loadLastSets([patch.exerciseId]);
    },

    removeSlot: (slotKey) => {
      const { sets } = get();
      const all = slots();
      const slot = all.find((s) => s.key === slotKey);
      if (!slot) return;
      for (const s of setsForSlot(sets, slot, all)) get().removeSet(s.id);
      writeSlots(all.filter((s) => s.key !== slotKey));
    },

    logCardio: ({ type, durationMin }) => {
      const { uid, sessionId, session } = get();
      if (!uid || !sessionId || !session) return;
      const now = Date.now();
      addCardio(uid, {
        date: session.date,
        type,
        durationMin,
        intensity: "low",
        sessionId,
        createdAt: now,
      });
    },

    undoCardio: (entryId) => {
      const { uid } = get();
      if (uid) deleteCardio(uid, entryId);
    },

    finish: (notes, exerciseInfo) => {
      const { uid, sessionId, session, sets, lastSets, prs } = get();
      if (!uid || !sessionId || !session) return null;
      const { id: _id, ...doc } = session;
      const payload = buildFinish({
        sessionId,
        session: doc,
        sets,
        previousLastSets: lastSets,
        previousPrs: prs,
        exerciseInfo,
        notes,
        now: Date.now(),
      });
      finishSession({ uid, sessionId, ...payload });
      detach();
      // The finished sets are now "last time" (and the new records) for the next workout.
      set((s) => ({
        ...EMPTY,
        status: "none",
        dismissed: {},
        lastSets: { ...s.lastSets, ...payload.lastSets },
        prs: { ...s.prs, ...payload.prs },
      }));
      return payload;
    },

    discard: () => {
      const { uid, sessionId, sets, cardio } = get();
      if (!uid || !sessionId) return;
      discardSession(
        uid,
        sessionId,
        sets.map((s) => s.id),
        cardio.map((c) => c.id),
      );
      detach();
      set({ ...EMPTY, status: "none", dismissed: {} });
    },
  };
});
