"use client";

import { SerwistProvider, useSerwist } from "@serwist/turbopack/react";
import { RefreshCw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useInstallStore } from "./install";

export function PwaProvider({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV === "development"}
      // Never auto-reload when the connection returns — it would interrupt a workout.
      reloadOnOnline={false}
    >
      <InstallCapture />
      <UpdatePrompt />
      {children}
    </SerwistProvider>
  );
}

function InstallCapture() {
  const init = useInstallStore((s) => s.init);
  useEffect(() => init(), [init]);
  return null;
}

/** Shows a banner when a new version is waiting; the user decides when to reload. */
function UpdatePrompt() {
  const { serwist } = useSerwist();
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!serwist) return;
    const onWaiting = () => setWaiting(true);
    serwist.addEventListener("waiting", onWaiting);
    return () => serwist.removeEventListener("waiting", onWaiting);
  }, [serwist]);

  if (!waiting || !serwist) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-lg"
    >
      <RefreshCw aria-hidden className="size-5 shrink-0 text-accent" />
      <p className="flex-1 text-sm">A new version is available.</p>
      <Button variant="ghost" onClick={() => setWaiting(false)}>
        Later
      </Button>
      <Button
        onClick={() => {
          serwist.addEventListener("controlling", () => window.location.reload());
          serwist.messageSkipWaiting();
        }}
      >
        Update
      </Button>
    </div>
  );
}
