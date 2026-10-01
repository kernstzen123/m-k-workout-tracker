"use client";

import { Download, Share } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Page";
import { useInstallStore } from "./install";

/** Install instructions / button. Renders nothing once the app runs installed. */
export function InstallCard() {
  const { deferred, standalone, ios, promptInstall } = useInstallStore();
  if (standalone) return null;

  if (deferred) {
    return (
      <Card className="flex items-center gap-3">
        <Download aria-hidden className="size-6 shrink-0 text-accent" />
        <p className="flex-1 text-sm">Install the app for offline use and a full-screen view.</p>
        <Button onClick={() => void promptInstall()}>Install</Button>
      </Card>
    );
  }

  if (ios) {
    return (
      <Card className="flex items-start gap-3">
        <Share aria-hidden className="mt-0.5 size-6 shrink-0 text-accent" />
        <p className="text-sm">
          To install: open this page in <strong>Safari</strong>, tap <strong>Share</strong>, then{" "}
          <strong>Add to Home Screen</strong>.
        </p>
      </Card>
    );
  }

  return null;
}
