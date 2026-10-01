"use client";

import { SerwistProvider, useSerwist } from "@serwist/turbopack/react";
import { RefreshCw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { reportError } from "@/lib/monitoring";
import { shouldRemoveWorker } from "@/lib/pwa/staleWorkers";
import { useInstallStore } from "./install";

export function PwaProvider({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV === "development"}
      // Never auto-reload when the connection returns — it would interrupt a workout.
      reloadOnOnline={false}
    >
      <StaleWorkerCleanup />
      <InstallCapture />
      <UpdatePrompt />
      {children}
    </SerwistProvider>
  );
}

const RELOAD_FLAG = "mk-sw-cleanup-reloaded";

/**
 * Removes service workers that would serve stale or foreign responses on this origin:
 *  - in development, every worker (e.g. one left by an earlier `npm start` on the same port);
 *  - in production, any worker that isn't ours (e.g. another project once served on this origin).
 * Stale workers serve old cached HTML → hydration mismatches or failed chunk loads.
 * If such a worker controlled this page, reload once so it's served fresh.
 */
function StaleWorkerCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const dev = process.env.NODE_ENV === "development";
    void (async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      let removed = false;
      for (const reg of regs) {
        const script = reg.active?.scriptURL ?? reg.waiting?.scriptURL ?? reg.installing?.scriptURL;
        if (shouldRemoveWorker(script, dev)) removed = (await reg.unregister()) || removed;
      }
      if (dev && "caches" in window) {
        for (const key of await caches.keys()) await caches.delete(key);
      }
      let alreadyReloaded = false;
      try {
        alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === "1";
        sessionStorage.setItem(RELOAD_FLAG, removed ? "1" : "0");
      } catch {
        // Storage unavailable — skip the reload safeguard rather than risk a loop.
        alreadyReloaded = true;
      }
      if (removed && navigator.serviceWorker.controller && !alreadyReloaded)
        window.location.reload();
    })().catch((error: unknown) => reportError(error, { where: "StaleWorkerCleanup" }));
  }, []);
  return null;
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
