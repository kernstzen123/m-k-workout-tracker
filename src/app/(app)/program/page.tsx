import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Program" };

export default function Page() {
  return (
    <ComingSoon
      title="Program"
      phase={2}
      what="Shared weekly split editor with supersets, cardio finishers and ab work."
    />
  );
}
