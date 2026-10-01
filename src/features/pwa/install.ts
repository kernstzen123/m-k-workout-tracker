import { create } from "zustand";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallState {
  /** Chrome/Android: captured `beforeinstallprompt` event. */
  deferred: BeforeInstallPromptEvent | null;
  standalone: boolean;
  ios: boolean;
  init: () => () => void;
  promptInstall: () => Promise<boolean>;
}

export const useInstallStore = create<InstallState>((set, get) => ({
  deferred: null,
  standalone: false,
  ios: false,

  init: () => {
    const nav = navigator as Navigator & { standalone?: boolean };
    set({
      standalone: matchMedia("(display-mode: standalone)").matches || nav.standalone === true,
      ios: /iphone|ipad|ipod/i.test(navigator.userAgent),
    });
    const onPrompt = (e: Event) => {
      e.preventDefault();
      set({ deferred: e as BeforeInstallPromptEvent });
    };
    const onInstalled = () => set({ deferred: null, standalone: true });
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  },

  promptInstall: async () => {
    const { deferred } = get();
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    set({ deferred: null });
    return outcome === "accepted";
  },
}));
