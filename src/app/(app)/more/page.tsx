import type { Metadata } from "next";
import { MoreScreen } from "@/features/shell/MoreScreen";

export const metadata: Metadata = { title: "More" };

export default function Page() {
  return <MoreScreen />;
}
