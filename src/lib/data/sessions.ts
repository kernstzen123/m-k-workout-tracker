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
  increment,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type FieldValue,
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
import type { MuscleTally } from "@/lib/overload/volume";
import type { Muscle } from "@/lib/schemas/common";
import { prDocSchema, type PrDoc } from "@/lib/schemas/stats";
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

function parseSessions(snap: QuerySnapshot, where: string): Session[] {
  const list: Session[] = [];
  for (const d of snap.docs) {
    const parsed = parseDoc(sessionDocSchema, d.id, d.data(), where);
    if (parsed) list.push(parsed);
  }
  return list.sort((a, b) => b.startedAt - a.startedAt);
}

/**
 * The user's unfinished workout, if any (for crash/close recovery).
 * Deliberately index-free (equality filter only, newest picked on the client): draft recovery
 * must never depend on a composite index being deployed or finished building.
 */
export async function findDraftSession(uid: string): Promise<Session | null> {
  const q = query(sessionsCol(uid), where("status", "==", "draft"), limit(5));
  const snap = await getDocsCacheFirst(q);
  return parseSessions(snap, "findDraftSession")[0] ?? null;
}

/**
 * Most recent finished session (drives the "next day" suggestion). Index-free: the newest few
 * sessions by start time (single-field index), then the first finished one.
 */
export async function findLastDoneSession(uid: string): Promise<Session | null> {
  const q = query(sessionsCol(uid), orderBy("startedAt", "desc"), limit(10));
  const snap = await getDocsCacheFirst(q);
  return parseSessions(snap, "findLastDoneSession").find((s) => s.status === "done") ?? null;
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

export interface FinishWrite {
  uid: string;
  sessionId: string;
  session: SessionDoc;
  /** New `lastSets` docs keyed by exercise id. */
  lastSets: Record<string, LastSetsDoc>;
  /** Updated personal records keyed by exercise id. */
  prs: Record<string, PrDoc>;
  prSetIds: string[];
  weekId: string;
  weekly: Partial<Record<Muscle, MuscleTally>>;
}

/**
 * One atomic batch: the finished session, PR flags on its sets, and every denormalised doc
 * (`lastSets`, `prs`, `weeklyStats`). Weekly stats use increments, so two devices never clobber
 * each other's totals.
 */
/**
 * Resolves `true` once this device's cache shows the change — i.e. the write is committed to
 * IndexedDB (the SDK only raises snapshots after its local write transaction completes). Works
 * offline. Resolves `false` after `timeoutMs` as a safety net.
 *
 * Why: writes are queued asynchronously; leaving the page (reload, app close) before the queue
 * runs would lose them — e.g. a just-finished workout coming back as "in progress".
 */
function whenLocal(
  uid: string,
  sessionId: string,
  isApplied: (data: Record<string, unknown> | undefined) => boolean,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe: (() => void) | null = null;
    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe?.();
      resolve(ok);
    };
    const timer = setTimeout(() => settle(false), timeoutMs);
    unsubscribe = onSnapshot(
      sessionRef(uid, sessionId),
      { includeMetadataChanges: true },
      (snap) => {
        if (isApplied(snap.exists() ? snap.data() : undefined)) settle(true);
      },
      () => settle(false),
    );
    if (settled) unsubscribe();
  });
}

export const LOCAL_WRITE_TIMEOUT_MS = 4000;

export function finishSession(input: FinishWrite): Promise<boolean> {
  const { uid, sessionId, session, lastSets, prs, prSetIds, weekId, weekly } = input;
  const db = getDb();
  const batch = writeBatch(db);
  batch.set(sessionRef(uid, sessionId), sessionDocSchema.parse(session));
  for (const [exerciseId, data] of Object.entries(lastSets)) {
    batch.set(lastSetsRef(uid, exerciseId), lastSetsDocSchema.parse(data));
  }
  for (const [exerciseId, data] of Object.entries(prs)) {
    batch.set(doc(db, "users", uid, "prs", exerciseId), prDocSchema.parse(data));
  }
  for (const setId of prSetIds) {
    batch.update(doc(setsCol(uid, sessionId), setId), { isPR: true });
  }
  const muscles: Record<string, { sets: FieldValue; volume: FieldValue }> = {};
  for (const [muscle, t] of Object.entries(weekly) as Array<[Muscle, MuscleTally]>) {
    if (!Number.isFinite(t.sets) || !Number.isFinite(t.volume)) continue;
    muscles[muscle] = { sets: increment(t.sets), volume: increment(t.volume) };
  }
  batch.set(
    doc(db, "users", uid, "weeklyStats", weekId),
    { sessions: increment(1), muscles, updatedAt: Date.now() },
    { merge: true },
  );
  fireAndForget(batch.commit(), "finishSession", "Couldn't save the finished workout.");
  return whenLocal(uid, sessionId, (d) => d?.status === "done", LOCAL_WRITE_TIMEOUT_MS);
}

/** Delete an unfinished workout; resolves once the deletion is durable locally. */
export function discardSession(
  uid: string,
  sessionId: string,
  setIds: string[],
  cardioIds: string[],
): Promise<boolean> {
  const batch = writeBatch(getDb());
  for (const id of setIds) batch.delete(doc(setsCol(uid, sessionId), id));
  for (const id of cardioIds) batch.delete(cardioRef(uid, id));
  batch.delete(sessionRef(uid, sessionId));
  fireAndForget(batch.commit(), "discardSession");
  return whenLocal(uid, sessionId, (d) => d === undefined, LOCAL_WRITE_TIMEOUT_MS);
}
