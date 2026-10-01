import type { Metadata } from "next";
import { CompareScreen } from "@/features/compare/CompareScreen";

export const metadata: Metadata = { title: "Compare" };

export default function Page() {
  return <CompareScreen />;
}
