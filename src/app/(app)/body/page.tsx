import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Body" };

export default function Page() {
  return (
    <ComingSoon
      title="Body"
      phase={4}
      what="Bodyweight (7-day average), body fat and tape measurements."
    />
  );
}
