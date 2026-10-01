import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Unsubscribe,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

export interface AuthUser {
  uid: string;
  email: string | null;
}

export function subscribeAuth(onChange: (user: AuthUser | null) => void): Unsubscribe {
  return onAuthStateChanged(getFirebaseAuth(), (user) =>
    onChange(user ? { uid: user.uid, email: user.email } : null),
  );
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
}

/** Human-readable message for Firebase Auth error codes. */
export function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/network-request-failed":
      return "No connection. You need to be online to sign in the first time.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    default:
      return "Sign-in failed. Please try again.";
  }
}
