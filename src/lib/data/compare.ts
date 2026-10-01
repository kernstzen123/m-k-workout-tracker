import { collection, getDocs, limit, query } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { userProfileSchema, type UserProfile } from "@/lib/schemas/user";
import { prDocSchema, type PrDoc } from "@/lib/schemas/stats";
import { parseDoc } from "./util";

/** The other allowlisted user (both can read each other's profile). Null until they've signed in. */
export async function findPartner(myUid: string): Promise<(UserProfile & { uid: string }) | null> {
  const snap = await getDocs(query(collection(getDb(), "users"), limit(5)));
  for (const d of snap.docs) {
    if (d.id === myUid) continue;
    const parsed = parseDoc(userProfileSchema, d.id, d.data(), "findPartner");
    if (parsed) {
      const { id, ...profile } = parsed;
      return { ...profile, uid: id };
    }
  }
  return null;
}

/**
 * All personal records for a user. For the partner this is allowed only while they share
 * (rules: `shareCompare != false`) — otherwise it rejects with `permission-denied`.
 */
export async function listPrs(uid: string): Promise<Record<string, PrDoc>> {
  const snap = await getDocs(query(collection(getDb(), "users", uid, "prs"), limit(300)));
  const out: Record<string, PrDoc> = {};
  for (const d of snap.docs) {
    const parsed = parseDoc(prDocSchema, d.id, d.data(), "listPrs");
    if (parsed) {
      const { id, ...data } = parsed;
      out[id] = data;
    }
  }
  return out;
}
