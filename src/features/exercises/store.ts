import { create } from "zustand";
import { seedExercises, subscribeExercises } from "@/lib/data/exercises";
import { reportError } from "@/lib/monitoring";
import type { Exercise } from "@/lib/schemas/exercise";
import { toast } from "@/lib/toast";

interface ExercisesState {
  status: "idle" | "loading" | "ready" | "error";
  exercises: Exercise[];
  byId: ReadonlyMap<string, Exercise>;
  /** Start the single app-wide listener. Returns the unsubscribe function. */
  start: () => () => void;
}

export const useExercisesStore = create<ExercisesState>((set) => ({
  status: "idle",
  exercises: [],
  byId: new Map(),
  start: () => {
    set({ status: "loading" });
    let seeding = false;
    return subscribeExercises(
      (exercises, { fromCache }) => {
        // An empty result straight from the cache isn't an answer yet — keep showing "loading".
        const settled = exercises.length > 0 || !fromCache;
        set({
          exercises,
          byId: new Map(exercises.map((e) => [e.id, e])),
          status: settled ? "ready" : "loading",
        });
        // First run against an empty server collection → seed the shared library once.
        if (!fromCache && exercises.length === 0 && !seeding) {
          seeding = true;
          seedExercises()
            .then((n) => toast.success(`Exercise library ready (${n} exercises).`))
            .catch((error: unknown) => {
              seeding = false;
              reportError(error, { where: "seedExercises" });
              toast.error("Couldn't set up the exercise library. Check your connection.");
            });
        }
      },
      (error) => {
        reportError(error, { where: "subscribeExercises" });
        set({ status: "error" });
        toast.error("Couldn't load exercises.");
      },
    );
  },
}));
