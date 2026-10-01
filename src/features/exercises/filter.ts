import { MUSCLE_LABELS, type Muscle } from "@/lib/schemas/common";
import type { Exercise } from "@/lib/schemas/exercise";

export interface ExerciseFilter {
  query: string;
  muscle: Muscle | "all";
  showArchived: boolean;
}

/** Client-side search over the (small, fully cached) library. All query words must match. */
export function filterExercises(exercises: readonly Exercise[], f: ExerciseFilter): Exercise[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  return exercises.filter((e) => {
    if (!f.showArchived && e.archived) return false;
    if (f.muscle !== "all" && e.muscle !== f.muscle && !e.secondary.includes(f.muscle))
      return false;
    if (words.length === 0) return true;
    const haystack = `${e.name} ${MUSCLE_LABELS[e.muscle]} ${e.equipment}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}
