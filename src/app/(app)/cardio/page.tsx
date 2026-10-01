import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Cardio" };

export default function Page() {
  return <ComingSoon title="Cardio" phase={4} what="Cardio log with weekly totals." />;
}
