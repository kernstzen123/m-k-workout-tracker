import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

export const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

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
