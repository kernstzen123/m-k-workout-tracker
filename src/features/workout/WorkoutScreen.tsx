"use client";

import { Spinner } from "@/components/ui/Page";
import { ActiveWorkout } from "./ActiveWorkout";
import { StartWorkout } from "./StartWorkout";
import { useWorkoutStore } from "./store";

export function WorkoutScreen() {
  const status = useWorkoutStore((s) => s.status);
  const session = useWorkoutStore((s) => s.session);

  if (status === "active" && session) return <ActiveWorkout session={session} />;
  if (status === "none") return <StartWorkout />;
  return <Spinner label="Looking for an unfinished workout" />;
}
