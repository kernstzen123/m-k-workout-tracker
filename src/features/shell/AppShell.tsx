"use client";

import { CloudOff } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { AuthGate } from "@/features/auth/AuthGate";
import { useAuthStore } from "@/features/auth/store";
import { useExercisesStore } from "@/features/exercises/store";
import { useProgramStore } from "@/features/program/store";
import { useOnline } from "@/features/pwa/useOnline";
import { RestTimerBar, RestTimerEngine } from "@/features/rest-timer/RestTimer";
import { useWorkoutStore } from "@/features/workout/store";
import { BottomNav } from "./BottomNav";

/** Starts the app-wide data listeners once the user is signed in. */
function DataSync() {
  const uid = useAuthStore((s) => s.user?.uid);
  const startExercises = useExercisesStore((s) => s.start);
  const startProgram = useProgramStore((s) => s.start);
  const initWorkout = useWorkoutStore((s) => s.init);

  useEffect(() => startExercises(), [startExercises]);
  useEffect(() => (uid ? startProgram(uid) : undefined), [uid, startProgram]);
  // Resumes an unfinished workout automatically (after a crash, reload or closed app).
  useEffect(() => (uid ? initWorkout(uid) : undefined), [uid, initWorkout]);
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
      <RestTimerEngine />
      <OfflineBanner />
      <main className="mx-auto max-w-lg px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <RestTimerBar />
      <BottomNav />
    </AuthGate>
  );
}
