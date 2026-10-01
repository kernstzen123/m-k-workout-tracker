import { doc, getDoc, getDocFromCache, getDocFromServer, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { errorCode, reportError } from "@/lib/monitoring";
import { userProfileSchema, type UserProfile } from "@/lib/schemas/user";
import { fireAndForget } from "./util";

export const DEFAULT_REST_SEC = 120;

const userRef = (uid: string) => doc(getDb(), "users", uid);

function defaultProfile(email: string | null): UserProfile {
  const name = (email?.split("@")[0] ?? "Lifter").slice(0, 50) || "Lifter";
  return { name, defaultRestSec: DEFAULT_REST_SEC, shareCompare: true, createdAt: Date.now() };
}

export type ProfileResult = { status: "ok"; profile: UserProfile } | { status: "denied" };

/**
 * Load the signed-in user's profile, creating it on first login. Doubles as the allowlist check:
 * a non-allowlisted account gets `permission-denied` from the rules.
 *
 * Cache-first so app start is instant (and works offline); the server check then runs in the
 * background and calls `onDenied` if access was revoked.
 */
export async function loadProfile(
  uid: string,
  email: string | null,
  onDenied: () => void,
): Promise<ProfileResult> {
  const ref = userRef(uid);

  try {
    const cached = await getDocFromCache(ref);
    if (cached.exists()) {
      const parsed = userProfileSchema.safeParse(cached.data());
      if (parsed.success) {
        getDocFromServer(ref).catch((error: unknown) => {
          if (errorCode(error) === "permission-denied") onDenied();
        });
        return { status: "ok", profile: parsed.data };
      }
    }
  } catch {
    // Not in cache — fall through to a normal read.
  }

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const parsed = userProfileSchema.safeParse(snap.data());
      if (parsed.success) return { status: "ok", profile: parsed.data };
      reportError(parsed.error, { where: "loadProfile", uid });
    }
    const profile = defaultProfile(email);
    fireAndForget(setDoc(ref, userProfileSchema.parse(profile)), "createProfile");
    return { status: "ok", profile };
  } catch (error) {
    if (errorCode(error) === "permission-denied") return { status: "denied" };
    // Offline on a fresh device: continue with defaults; the rules still guard all data.
    reportError(error, { where: "loadProfile", uid });
    return { status: "ok", profile: defaultProfile(email) };
  }
}

export function updateProfile(uid: string, profile: UserProfile): void {
  fireAndForget(setDoc(userRef(uid), userProfileSchema.parse(profile)), "updateProfile");
}

const nameCache = new Map<string, string>();

/** Display name for a user id (e.g. "Last edited by …"). Cached for the app session. */
export async function getUserName(uid: string): Promise<string | null> {
  const cached = nameCache.get(uid);
  if (cached) return cached;
  try {
    const snap = await getDoc(userRef(uid));
    const parsed = userProfileSchema.safeParse(snap.data());
    if (!parsed.success) return null;
    nameCache.set(uid, parsed.data.name);
    return parsed.data.name;
  } catch (error) {
    reportError(error, { where: "getUserName", uid });
    return null;
  }
}
