import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Workout" };

export default function Page() {
  return (
    <ComingSoon
      title="Workout"
      phase={2}
      what="Live logging with rest timer, pre-filled sets and draft recovery."
    />
  );
}
