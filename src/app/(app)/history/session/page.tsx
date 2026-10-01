import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Session" };

export default function Page() {
  return <ComingSoon title="Session" phase={4} what="Session detail." />;
}
