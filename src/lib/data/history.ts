import {
  collection,
  doc,
  getDoc,
  getDocFromCache,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import {
  sessionDocSchema,
  setDocSchema,
  type Session,
  type WorkoutSet,
} from "@/lib/schemas/session";
import { parseDoc } from "./util";

const sessionsCol = (uid: string) => collection(getDb(), "users", uid, "sessions");

export const HISTORY_PAGE_SIZE = 20;

export interface HistoryPage {
  sessions: Session[];
  /** Pass back as `after` to load the next page; null when there are no more. */
  cursor: number | null;
}

/**
 * One page of finished sessions, newest first (status + startedAt composite index). Bounded by
 * `HISTORY_PAGE_SIZE` so history never becomes an unbounded read.
 */
export async function listDoneSessions(
  uid: string,
  opts: { after?: number | null; dayId?: string | null } = {},
): Promise<HistoryPage> {
  const constraints: QueryConstraint[] = [where("status", "==", "done")];
  if (opts.dayId) constraints.push(where("dayId", "==", opts.dayId));
  constraints.push(orderBy("startedAt", "desc"));
  if (opts.after) constraints.push(startAfter(opts.after));
  constraints.push(limit(HISTORY_PAGE_SIZE));
  const snap = await getDocs(query(sessionsCol(uid), ...constraints));
  const sessions: Session[] = [];
  for (const d of snap.docs) {
    const parsed = parseDoc(sessionDocSchema, d.id, d.data(), "listDoneSessions");
    if (parsed) sessions.push(parsed);
  }
  const last = sessions.at(-1);
  return {
    sessions,
    cursor: snap.docs.length === HISTORY_PAGE_SIZE && last ? last.startedAt : null,
  };
}

/** Finished sessions since a timestamp (consistency stats, Home). Live, bounded by the window. */
export function subscribeDoneSince(
  uid: string,
  sinceMs: number,
  onData: (sessions: Session[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(
    sessionsCol(uid),
    where("status", "==", "done"),
    where("startedAt", ">=", sinceMs),
    orderBy("startedAt", "desc"),
    limit(200),
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: Session[] = [];
      for (const d of snap.docs) {
        const parsed = parseDoc(sessionDocSchema, d.id, d.data(), "subscribeDoneSince");
        if (parsed) list.push(parsed);
      }
      onData(list);
    },
    onError,
  );
}

/** A session + its sets (cache first). `ownerUid` may be the partner (rules allow reading). */
export async function getSessionWithSets(
  ownerUid: string,
  sessionId: string,
): Promise<{ session: Session | null; sets: WorkoutSet[] }> {
  const ref = doc(sessionsCol(ownerUid), sessionId);
  let snap;
  try {
    snap = await getDocFromCache(ref);
  } catch {
    snap = await getDoc(ref);
  }
  const session = snap.exists()
    ? parseDoc(sessionDocSchema, snap.id, snap.data(), "getSessionWithSets")
    : null;
  if (!session) return { session: null, sets: [] };
  const setsSnap = await getDocs(collection(ref, "sets"));
  const sets: WorkoutSet[] = [];
  for (const d of setsSnap.docs) {
    const parsed = parseDoc(setDocSchema, d.id, d.data(), "getSessionWithSets/sets");
    if (parsed) sets.push(parsed);
  }
  return { session, sets };
}
