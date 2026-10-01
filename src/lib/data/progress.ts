import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type QuerySnapshot,
} from "firebase/firestore";
import { subWeeks } from "date-fns";
import { isoWeekId } from "@/lib/dates";
import { getDb } from "@/lib/firebase/client";
import { lastSetsDocSchema, type LastSetsDoc } from "@/lib/schemas/session";
import { weeklyStatsDocSchema, type WeeklyStats } from "@/lib/schemas/stats";
import { parseDoc } from "./util";

/** Exercises the user has trained, most recent first, with their full history (for charts). */
export async function listTrainedExercises(
  uid: string,
): Promise<Array<LastSetsDoc & { exerciseId: string }>> {
  const snap: QuerySnapshot = await getDocs(
    query(collection(getDb(), "users", uid, "lastSets"), orderBy("updatedAt", "desc"), limit(80)),
  );
  const out: Array<LastSetsDoc & { exerciseId: string }> = [];
  for (const d of snap.docs) {
    const parsed = parseDoc(lastSetsDocSchema, d.id, d.data(), "listTrainedExercises");
    if (parsed) {
      const { id, ...data } = parsed;
      out.push({ ...data, exerciseId: id });
    }
  }
  return out;
}

/**
 * Weekly stats for the last `count` weeks, newest first. Week ids (`YYYY-Www`) sort
 * chronologically as strings, so an ascending id range from `count` weeks ago does the job
 * (Firestore cannot scan document ids in descending order).
 */
export async function listWeeklyStats(uid: string, count = 8): Promise<WeeklyStats[]> {
  const fromId = isoWeekId(subWeeks(new Date(), count - 1));
  const snap = await getDocs(
    query(
      collection(getDb(), "users", uid, "weeklyStats"),
      where(documentId(), ">=", fromId),
      orderBy(documentId()),
      limit(count + 1),
    ),
  );
  const out: WeeklyStats[] = [];
  for (const d of snap.docs) {
    const parsed = parseDoc(weeklyStatsDocSchema, d.id, d.data(), "listWeeklyStats");
    if (parsed) out.push(parsed);
  }
  return out.reverse();
}
