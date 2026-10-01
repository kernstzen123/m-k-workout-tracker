import type { Metadata } from "next";
import { ProgramScreen } from "@/features/program/ProgramScreen";

export const metadata: Metadata = { title: "Program" };

export default function Page() {
  return <ProgramScreen />;
}
