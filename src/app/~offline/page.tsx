import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <WifiOff aria-hidden className="size-12 text-muted" />
      <h1 className="text-2xl font-bold">You&apos;re offline</h1>
      <p className="max-w-sm text-muted">
        This page hasn&apos;t been cached yet. Open the app from the home screen; anything you log
        is saved on the device and syncs when you&apos;re back online.
      </p>
      <Link
        href="/"
        className="min-h-12 rounded-xl bg-accent px-6 py-3 font-semibold text-accent-fg"
      >
        Go to Home
      </Link>
    </main>
  );
}
