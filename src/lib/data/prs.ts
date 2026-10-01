import { doc, getDoc, getDocFromCache } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { prDocSchema, type PrDoc } from "@/lib/schemas/stats";
import { parseDoc } from "./util";

/** Personal records for one exercise (cache first — works offline). */
export async function getPrs(uid: string, exerciseId: string): Promise<PrDoc | null> {
  const ref = doc(getDb(), "users", uid, "prs", exerciseId);
  let snap;
  try {
    snap = await getDocFromCache(ref);
  } catch {
    snap = await getDoc(ref);
  }
  if (!snap.exists()) return null;
  const parsed = parseDoc(prDocSchema, snap.id, snap.data(), "getPrs");
  if (!parsed) return null;
  const { id: _id, ...data } = parsed;
  return data;
}
