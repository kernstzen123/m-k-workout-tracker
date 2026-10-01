"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { reportError } from "@/lib/monitoring";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => reportError(error, { where: "route error boundary" }), [error]);

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <AlertTriangle aria-hidden className="size-12 text-danger" />
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="max-w-sm text-muted">
        Your logged sets are stored on this device, so nothing is lost. Try again, or go back home.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center rounded-xl border border-border bg-surface-2 px-4 font-semibold"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
