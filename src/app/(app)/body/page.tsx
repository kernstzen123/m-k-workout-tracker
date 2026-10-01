import type { Metadata } from "next";
import { BodyScreen } from "@/features/body/BodyScreen";

export const metadata: Metadata = { title: "Body" };

export default function Page() {
  return <BodyScreen />;
}
