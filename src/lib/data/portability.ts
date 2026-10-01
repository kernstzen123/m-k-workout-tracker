import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  writeBatch,
  doc,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import type { ImportPlan } from "@/lib/csv/plan";
import { getDb } from "@/lib/firebase/client";
import {
  lastSetsDocSchema,
  sessionDocSchema,
  setDocSchema,
  type LastSetsDoc,
  type Session,
  type WorkoutSet,
} from "@/lib/schemas/session";
import { prDocSchema, type PrDoc } from "@/lib/schemas/stats";
import {
  cardioDocSchema,
  measurementDocSchema,
  type CardioDoc,
  type CardioEntry,
  type Measurement,
  type MeasurementDoc,
} from "@/lib/schemas/tracking";
import { parseDoc } from "./util";

const PAGE = 300;
/** Firestore allows 500 writes per batch; keep headroom. */
const BATCH_LIMIT = 450;

async function readAll<T>(
  path: string[],
  order: string,
  parse: (id: string, data: DocumentData) => T | null,
  onPage?: (count: number) => void,
): Promise<T[]> {
  const out: T[] = [];
  let cursor: unknown = undefined;
  for (;;) {
    const constraints: QueryConstraint[] = [orderBy(order), limit(PAGE)];
    if (cursor !== undefined) constraints.splice(1, 0, startAfter(cursor));
    const [first, ...rest] = path;
    const snap = await getDocs(query(collection(getDb(), first!, ...rest), ...constraints));
    for (const d of snap.docs) {
      const parsed = parse(d.id, d.data());
      if (parsed) out.push(parsed);
    }
    onPage?.(out.length);
    if (snap.docs.length < PAGE) return out;
    cursor = snap.docs.at(-1)!.get(order);
  }
}

/**
 * Every finished workout with its sets — for CSV export. Costs about one read per session plus
 * one per set, so it's an on-demand action (never automatic).
 */
export async function fetchAllWorkouts(
  uid: string,
  onProgress: (message: string) => void,
): Promise<{ sessions: Session[]; setsBySession: Map<string, WorkoutSet[]> }> {
  const all = await readAll(["users", uid, "sessions"], "startedAt", (id, d) =>
    parseDoc(sessionDocSchema, id, d, "export/sessions"),
  );
  const sessions = all.filter((s) => s.status === "done");
  const setsBySession = new Map<string, WorkoutSet[]>();
  let i = 0;
  for (const s of sessions) {
    const snap = await getDocs(collection(getDb(), "users", uid, "sessions", s.id, "sets"));
    const sets: WorkoutSet[] = [];
    for (const d of snap.docs) {
      const parsed = parseDoc(setDocSchema, d.id, d.data(), "export/sets");
      if (parsed) sets.push(parsed);
    }
    setsBySession.set(s.id, sets);
    if (++i % 10 === 0 || i === sessions.length)
      onProgress(`Reading workouts… ${i}/${sessions.length}`);
  }
  return { sessions, setsBySession };
}

export function fetchAllCardio(uid: string): Promise<CardioEntry[]> {
  return readAll(["users", uid, "cardio"], "date", (id, d) =>
    parseDoc(cardioDocSchema, id, d, "export/cardio"),
  );
}

export function fetchAllMeasurements(uid: string): Promise<Measurement[]> {
  return readAll(["users", uid, "measurements"], "date", (id, d) =>
    parseDoc(measurementDocSchema, id, d, "export/measurements"),
  );
}

/** Fetch docs by id in chunks of 30 (`in` query) — only docs that exist are read. */
async function getByIds<T>(
  path: string[],
  ids: readonly string[],
  parse: (id: string, data: DocumentData) => T | null,
): Promise<Record<string, T>> {
  const out: Record<string, T> = {};
  const [first, ...rest] = path;
  for (let i = 0; i < ids.length; i += 30) {
    const chunk = ids.slice(i, i + 30);
    if (chunk.length === 0) continue;
    const snap = await getDocs(
      query(collection(getDb(), first!, ...rest), where(documentId(), "in", chunk)),
    );
    for (const d of snap.docs) {
      const parsed = parse(d.id, d.data());
      if (parsed) out[d.id] = parsed;
    }
  }
  return out;
}

export async function existingIds(
  uid: string,
  sub: "sessions" | "cardio" | "measurements",
  ids: readonly string[],
) {
  const found = await getByIds(["users", uid, sub], ids, () => true);
  return new Set(Object.keys(found));
}

export async function getExistingAggregates(
  uid: string,
  exerciseIds: readonly string[],
): Promise<{ lastSets: Record<string, LastSetsDoc>; prs: Record<string, PrDoc> }> {
  const strip = <T extends { id: string }>(x: T | null) => {
    if (!x) return null;
    const { id: _id, ...rest } = x;
    return rest as Omit<T, "id">;
  };
  const [lastSets, prs] = await Promise.all([
    getByIds(["users", uid, "lastSets"], exerciseIds, (id, d) =>
      strip(parseDoc(lastSetsDocSchema, id, d, "import/lastSets")),
    ),
    getByIds(["users", uid, "prs"], exerciseIds, (id, d) =>
      strip(parseDoc(prDocSchema, id, d, "import/prs")),
    ),
  ]);
  return { lastSets, prs };
}

/** Commit writes in ≤450-op batches, awaiting each (import needs a connection). */
async function commitInBatches(
  ops: Array<(b: ReturnType<typeof writeBatch>) => void>,
  onProgress: (done: number, total: number) => void,
) {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(getDb());
    for (const op of ops.slice(i, i + BATCH_LIMIT)) op(batch);
    await batch.commit();
    onProgress(Math.min(ops.length, i + BATCH_LIMIT), ops.length);
  }
}

export async function commitWorkoutImport(
  uid: string,
  plan: ImportPlan,
  onProgress: (done: number, total: number) => void,
): Promise<void> {
  const db = getDb();
  const ops: Array<(b: ReturnType<typeof writeBatch>) => void> = [];
  for (const s of plan.sessions) {
    const sessionData = sessionDocSchema.parse(s.doc);
    ops.push((b) => b.set(doc(db, "users", uid, "sessions", s.id), sessionData));
    for (const set of s.sets) {
      const setData = setDocSchema.parse(set.doc);
      ops.push((b) => b.set(doc(db, "users", uid, "sessions", s.id, "sets", set.id), setData));
    }
  }
  for (const [id, data] of Object.entries(plan.lastSets)) {
    const parsed = lastSetsDocSchema.parse(data);
    ops.push((b) => b.set(doc(db, "users", uid, "lastSets", id), parsed));
  }
  for (const [id, data] of Object.entries(plan.prs)) {
    const parsed = prDocSchema.parse(data);
    ops.push((b) => b.set(doc(db, "users", uid, "prs", id), parsed));
  }
  for (const [weekId, bySession] of Object.entries(plan.weekly)) {
    const entries = Object.fromEntries(
      Object.entries(bySession).map(([sessionId, muscles]) => [sessionId, { muscles }]),
    );
    ops.push((b) =>
      b.set(
        doc(db, "users", uid, "weeklyStats", weekId),
        { bySession: entries, updatedAt: Date.now() },
        { merge: true },
      ),
    );
  }
  await commitInBatches(ops, onProgress);
}

export async function commitDocImport(
  uid: string,
  sub: "cardio" | "measurements",
  entries: ReadonlyArray<{ id: string; data: CardioDoc | MeasurementDoc }>,
  onProgress: (done: number, total: number) => void,
): Promise<void> {
  const db = getDb();
  const schema = sub === "cardio" ? cardioDocSchema : measurementDocSchema;
  const ops = entries.map((e) => {
    const parsed = schema.parse(e.data);
    return (b: ReturnType<typeof writeBatch>) => b.set(doc(db, "users", uid, sub, e.id), parsed);
  });
  await commitInBatches(ops, onProgress);
}
