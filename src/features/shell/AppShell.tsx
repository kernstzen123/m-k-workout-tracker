"use client";

import { CloudOff } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { AuthGate } from "@/features/auth/AuthGate";
import { useExercisesStore } from "@/features/exercises/store";
import { useOnline } from "@/features/pwa/useOnline";
import { BottomNav } from "./BottomNav";

/** Starts the app-wide data listeners once the user is signed in. */
function DataSync() {
  const startExercises = useExercisesStore((s) => s.start);
  useEffect(() => startExercises(), [startExercises]);
  return null;
}

function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-warning/15 px-3 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] text-sm font-semibold text-warning"
    >
      <CloudOff aria-hidden className="size-4" />
      Offline — everything is saved on this device and will sync.
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <DataSync />
      <OfflineBanner />
      <main className="mx-auto max-w-lg px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav />
    </AuthGate>
  );
}
