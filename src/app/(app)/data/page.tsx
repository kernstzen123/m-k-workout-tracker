import type { Metadata } from "next";
import { DataScreen } from "@/features/portability/DataScreen";

export const metadata: Metadata = { title: "Import & export" };

export default function Page() {
  return <DataScreen />;
}
