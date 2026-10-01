import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { reportError } from "@/lib/monitoring";
import { getFirebaseApp, useEmulators } from "./app";

/**
 * Firestore entry point (repositories import `getDb` from here). Auth lives in `./auth` and app
 * config in `./app`, so screens that only need sign-in don't pull in the Firestore SDK.
 *
 * The instance lives on globalThis, not in a module variable: if this module is evaluated again
 * (dev Fast Refresh, duplicated chunk), we must reuse the already-initialised SDK instance.
 */
const g = globalThis as typeof globalThis & { __mkDb?: Firestore };

/**
 * Firestore with a persistent IndexedDB cache shared across tabs, so a whole workout can be
 * logged offline and syncs later. Falls back to a memory cache where IndexedDB is unavailable.
 */
export function getDb(): Firestore {
  if (g.__mkDb) return g.__mkDb;
  const firebaseApp = getFirebaseApp();
  let db: Firestore;
  let fresh = true;
  try {
    db = initializeFirestore(firebaseApp, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (error) {
    if (String(error).includes("already been called")) {
      // Already initialised by an earlier evaluation of this module — reuse it.
      db = getFirestore(firebaseApp);
      fresh = false;
    } else {
      reportError(error, { where: "initializeFirestore(persistent)" });
      db = initializeFirestore(firebaseApp, {
        ignoreUndefinedProperties: true,
        localCache: memoryLocalCache(),
      });
    }
  }
  if (useEmulators && fresh) connectFirestoreEmulator(db, "127.0.0.1", 8080);
  g.__mkDb = db;
  return db;
}
