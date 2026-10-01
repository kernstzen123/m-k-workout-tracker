import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
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

const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

// NEXT_PUBLIC_* must be referenced literally so Next.js can inline them at build time.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || (useEmulators ? "demo-api-key" : undefined),
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  // Emulators always use the demo project (matches `--project demo-mk-workout` in npm scripts).
  projectId: useEmulators ? "demo-mk-workout" : process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Instances live on globalThis, not in module variables: if this module is evaluated again
 * (dev Fast Refresh, duplicated chunk), we must reuse the already-initialised SDK instances.
 */
const g = globalThis as typeof globalThis & { __mkAuth?: Auth; __mkDb?: Firestore };

function assertBrowser(): void {
  if (typeof window === "undefined") {
    throw new Error("Firebase client SDK must only be used in the browser (call from effects).");
  }
}

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId);
}

export function getFirebaseApp(): FirebaseApp {
  assertBrowser();
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Copy .env.example to .env.local and fill it in.");
  }
  return getApps().length ? getApp() : initializeApp(config);
}

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
