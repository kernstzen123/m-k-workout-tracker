import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { getFirebaseApp, useEmulators } from "./app";

/** Instance on globalThis so a re-evaluated module (dev Fast Refresh) reuses it. */
const g = globalThis as typeof globalThis & { __mkAuth?: Auth };

/** Auth only — kept separate from Firestore so the login screen doesn't load the Firestore SDK. */
export function getFirebaseAuth(): Auth {
  if (!g.__mkAuth) {
    const auth = getAuth(getFirebaseApp());
    if (useEmulators && !auth.emulatorConfig) {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    }
    g.__mkAuth = auth;
  }
  return g.__mkAuth;
}
