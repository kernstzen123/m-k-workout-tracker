import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Progress" };

export default function Page() {
  return (
    <ComingSoon
      title="Progress"
      phase={4}
      what="Per-exercise charts, e1RM, volume and consistency stats."
    />
  );
}
