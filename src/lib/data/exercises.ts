import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import {
  exerciseDocSchema,
  exerciseInputSchema,
  type Exercise,
  type ExerciseDoc,
  type ExerciseInput,
} from "@/lib/schemas/exercise";
import { fireAndForget, parseDoc, uniqueSlug } from "./util";

const exercisesCol = () => collection(getDb(), "exercises");

/**
 * Live listener on the whole exercise library (~150 small docs, shared by both users).
 * One listener for the app lifetime; later snapshots only bill changed docs.
 */
export function subscribeExercises(
  onData: (exercises: Exercise[], meta: { fromCache: boolean }) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    exercisesCol(),
    // Metadata changes too: a server confirmation that the (cached) result is still empty
    // changes no data, and would otherwise never be delivered — so seeding would never run.
    { includeMetadataChanges: true },
    (snap) => {
      const list: Exercise[] = [];
      for (const d of snap.docs) {
        const parsed = parseDoc(exerciseDocSchema, d.id, d.data(), "subscribeExercises");
        if (parsed) list.push(parsed);
      }
      list.sort((a, b) => a.name.localeCompare(b.name));
      onData(list, { fromCache: snap.metadata.fromCache });
    },
    onError,
  );
}

/** Create a new exercise; returns its id (a slug of the name, de-duplicated). */
export function createExercise(input: ExerciseInput, takenIds: ReadonlySet<string>): string {
  const data = exerciseInputSchema.parse(input);
  const id = uniqueSlug(data.name, takenIds);
  const now = Date.now();
  const docData: ExerciseDoc = exerciseDocSchema.parse({
    ...data,
    archived: false,
    createdAt: now,
    updatedAt: now,
  });
  fireAndForget(setDoc(doc(exercisesCol(), id), docData), "createExercise");
  return id;
}

export function updateExercise(existing: Exercise, input: ExerciseInput): void {
  const data = exerciseInputSchema.parse(input);
  const { id, ...rest } = existing;
  const docData = exerciseDocSchema.parse({ ...rest, ...data, updatedAt: Date.now() });
  fireAndForget(setDoc(doc(exercisesCol(), id), docData), "updateExercise");
}

/** Exercises are never deleted (history may reference them) — only archived. */
export function setExerciseArchived(id: string, archived: boolean): void {
  fireAndForget(
    updateDoc(doc(exercisesCol(), id), { archived, updatedAt: Date.now() }),
    "setExerciseArchived",
  );
}

/**
 * Seed the shared library. Only called when the server reports an empty collection. Ids are
 * deterministic slugs, so if both users seed at the same moment the writes are identical.
 */
export async function seedExercises(): Promise<number> {
  // Loaded on demand: the seed list is only needed once, so it stays out of the app bundle.
  const { SEED_EXERCISES } = await import("@/seed/exercises");
  const db = getDb();
  const batch = writeBatch(db);
  const now = Date.now();
  for (const { id, ...input } of SEED_EXERCISES) {
    const data = exerciseDocSchema.parse({
      ...input,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(doc(exercisesCol(), id), data);
  }
  await batch.commit();
  return SEED_EXERCISES.length;
}
