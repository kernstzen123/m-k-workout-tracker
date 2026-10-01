import { doc, getDoc, getDocFromCache } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { lastSetsDocSchema, type LastSetsDoc } from "@/lib/schemas/session";
import { parseDoc } from "./util";

/** Last session's sets for an exercise (cache first — works offline). One read per exercise. */
export async function getLastSets(uid: string, exerciseId: string): Promise<LastSetsDoc | null> {
  const ref = doc(getDb(), "users", uid, "lastSets", exerciseId);
  let snap;
  try {
    snap = await getDocFromCache(ref);
  } catch {
    snap = await getDoc(ref);
  }
  if (!snap.exists()) return null;
  const parsed = parseDoc(lastSetsDocSchema, snap.id, snap.data(), "getLastSets");
  if (!parsed) return null;
  const { id: _id, ...data } = parsed;
  return data;
}
