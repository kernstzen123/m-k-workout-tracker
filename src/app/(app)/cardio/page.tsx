import type { Metadata } from "next";
import { CardioScreen } from "@/features/cardio/CardioScreen";

export const metadata: Metadata = { title: "Cardio" };

export default function Page() {
  return <CardioScreen />;
}
