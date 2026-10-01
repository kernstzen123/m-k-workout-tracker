import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "History" };

export default function Page() {
  return <ComingSoon title="History" phase={4} what="Session list with search and filters." />;
}
