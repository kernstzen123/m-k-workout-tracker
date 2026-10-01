import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDocsFromCache,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Query,
  type QuerySnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import {
  lastSetsDocSchema,
  sessionDocSchema,
  sessionExerciseSchema,
  setDocSchema,
  type LastSetsDoc,
  type Session,
  type SessionDoc,
  type SessionExercise,
  type SetDoc,
  type WorkoutSet,
} from "@/lib/schemas/session";
import { fireAndForget, parseDoc } from "./util";

const sessionsCol = (uid: string) => collection(getDb(), "users", uid, "sessions");
const sessionRef = (uid: string, id: string) => doc(sessionsCol(uid), id);
const setsCol = (uid: string, sessionId: string) => collection(sessionRef(uid, sessionId), "sets");
const lastSetsRef = (uid: string, exerciseId: string) =>
  doc(getDb(), "users", uid, "lastSets", exerciseId);
const cardioRef = (uid: string, id: string) => doc(getDb(), "users", uid, "cardio", id);

/** Client-generated id, so a session can be created offline. */
export function newSessionId(uid: string): string {
  return doc(sessionsCol(uid)).id;
}

export function newSetId(uid: string, sessionId: string): string {
  return doc(setsCol(uid, sessionId)).id;
}

export function createSession(uid: string, id: string, data: SessionDoc): void {
  fireAndForget(setDoc(sessionRef(uid, id), sessionDocSchema.parse(data)), "createSession");
}

export function subscribeSession(
  uid: string,
  id: string,
  onData: (session: Session | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    sessionRef(uid, id),
    (snap) =>
      onData(
        snap.exists() ? parseDoc(sessionDocSchema, snap.id, snap.data(), "subscribeSession") : null,
      ),
    onError,
  );
}

export function subscribeSets(
  uid: string,
  sessionId: string,
  onData: (sets: WorkoutSet[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    setsCol(uid, sessionId),
    (snap) => {
      const sets: WorkoutSet[] = [];
      for (const d of snap.docs) {
        const parsed = parseDoc(setDocSchema, d.id, d.data(), "subscribeSets");
        if (parsed) sets.push(parsed);
      }
      onData(sets);
    },
    onError,
  );
}

/** Cache first (instant + offline), then the server if the cache has nothing. */
async function getDocsCacheFirst(q: Query): Promise<QuerySnapshot> {
  try {
    const cached = await getDocsFromCache(q);
    if (!cached.empty) return cached;
  } catch {
    // Cache unavailable — fall through.
  }
  return getDocs(q);
}

/** The user's unfinished workout, if any (for crash/close recovery). */
export async function findDraftSession(uid: string): Promise<Session | null> {
  const q = query(
    sessionsCol(uid),
    where("status", "==", "draft"),
    orderBy("startedAt", "desc"),
    limit(1),
  );
  const snap = await getDocsCacheFirst(q);
  const d = snap.docs[0];
  return d ? parseDoc(sessionDocSchema, d.id, d.data(), "findDraftSession") : null;
}

/** Most recent finished session (drives the "next day" suggestion). */
export async function findLastDoneSession(uid: string): Promise<Session | null> {
  const q = query(
    sessionsCol(uid),
    where("status", "==", "done"),
    orderBy("startedAt", "desc"),
    limit(1),
  );
  const snap = await getDocsCacheFirst(q);
  const d = snap.docs[0];
  return d ? parseDoc(sessionDocSchema, d.id, d.data(), "findLastDoneSession") : null;
}

export function updateSessionExercises(
  uid: string,
  sessionId: string,
  exercises: SessionExercise[],
): void {
  const parsed = exercises.map((e) => sessionExerciseSchema.parse(e));
  fireAndForget(
    updateDoc(sessionRef(uid, sessionId), { exercises: parsed, updatedAt: Date.now() }),
    "updateSessionExercises",
  );
}

export function writeSet(uid: string, sessionId: string, setId: string, data: SetDoc): void {
  fireAndForget(
    setDoc(doc(setsCol(uid, sessionId), setId), setDocSchema.parse(data)),
    "writeSet",
    "Couldn't save that set.",
  );
}

export function deleteSet(uid: string, sessionId: string, setId: string): void {
  fireAndForget(deleteDoc(doc(setsCol(uid, sessionId), setId)), "deleteSet");
}

export interface FinishInput {
  uid: string;
  sessionId: string;
  session: SessionDoc;
  /** New `lastSets` docs keyed by exercise id. */
  lastSets: Record<string, LastSetsDoc>;
}

/** One atomic batch: the finished session plus its denormalised per-exercise docs. */
export function finishSession({ uid, sessionId, session, lastSets }: FinishInput): void {
  const batch = writeBatch(getDb());
  batch.set(sessionRef(uid, sessionId), sessionDocSchema.parse(session));
  for (const [exerciseId, data] of Object.entries(lastSets)) {
    batch.set(lastSetsRef(uid, exerciseId), lastSetsDocSchema.parse(data));
  }
  fireAndForget(batch.commit(), "finishSession", "Couldn't save the finished workout.");
}

/** Delete an unfinished workout with its sets and attached cardio. */
export function discardSession(
  uid: string,
  sessionId: string,
  setIds: string[],
  cardioIds: string[],
): void {
  const batch = writeBatch(getDb());
  for (const id of setIds) batch.delete(doc(setsCol(uid, sessionId), id));
  for (const id of cardioIds) batch.delete(cardioRef(uid, id));
  batch.delete(sessionRef(uid, sessionId));
  fireAndForget(batch.commit(), "discardSession");
}
