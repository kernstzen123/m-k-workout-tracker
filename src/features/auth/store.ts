import { create } from "zustand";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { signOutUser, subscribeAuth, type AuthUser } from "@/lib/data/auth";
import { loadProfile, updateProfile } from "@/lib/data/users";
import { reportError } from "@/lib/monitoring";
import type { UserProfile } from "@/lib/schemas/user";

export type AuthStatus = "loading" | "signedOut" | "signedIn" | "denied" | "unconfigured";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  profile: UserProfile | null;
  start: () => () => void;
  saveProfile: (profile: UserProfile) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  user: null,
  profile: null,

  start: () => {
    if (!isFirebaseConfigured()) {
      set({ status: "unconfigured" });
      return () => {};
    }
    let generation = 0;
    return subscribeAuth((user) => {
      const current = ++generation;
      if (!user) {
        set({ status: "signedOut", user: null, profile: null });
        return;
      }
      set({ status: "loading", user });
      const onDenied = () => {
        if (current === generation) set({ status: "denied", profile: null });
      };
      loadProfile(user.uid, user.email, onDenied)
        .then((result) => {
          if (current !== generation) return;
          if (result.status === "denied") set({ status: "denied", profile: null });
          else set({ status: "signedIn", profile: result.profile });
        })
        .catch((error: unknown) => {
          reportError(error, { where: "auth.start/loadProfile" });
          if (current === generation) set({ status: "signedIn" });
        });
    });
  },

  saveProfile: (profile) => {
    const { user } = get();
    if (!user) return;
    updateProfile(user.uid, profile);
    set({ profile });
  },

  signOut: async () => {
    await signOutUser();
  },
}));
