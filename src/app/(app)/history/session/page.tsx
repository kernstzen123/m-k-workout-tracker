import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/Page";
import { SessionDetail } from "@/features/history/SessionDetail";

export const metadata: Metadata = { title: "Workout" };

// The session id comes from ?id= (static route → precachable offline); search params need Suspense.
export default function Page() {
  return (
    <Suspense fallback={<Spinner label="Loading workout" />}>
      <SessionDetail />
    </Suspense>
  );
}
