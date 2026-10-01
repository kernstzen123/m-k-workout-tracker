import type { Metadata } from "next";
import { ExerciseLibrary } from "@/features/exercises/ExerciseLibrary";

export const metadata: Metadata = { title: "Exercises" };

export default function Page() {
  return <ExerciseLibrary />;
}
