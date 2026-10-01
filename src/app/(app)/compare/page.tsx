import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Compare" };

export default function Page() {
  return (
    <ComingSoon
      title="Compare"
      phase={5}
      what="Our key lifts side by side (with an opt-out in Settings)."
    />
  );
}
