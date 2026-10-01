"use client";

import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/Page";
import { Switch } from "@/components/ui/Switch";
import { useInstallStore } from "@/features/pwa/install";
import { toast } from "@/lib/toast";
import { notificationsEnabled, notificationsSupported, setNotificationsEnabled } from "./alerts";

/** Settings card: rest-timer notifications when the app is in the background. */
export function RestAlertsCard() {
  const { ios, standalone } = useInstallStore();
  // Rendered client-side only (behind the auth gate), so browser APIs are safe here.
  const [supported] = useState(notificationsSupported);
  const [enabled, setEnabled] = useState(notificationsEnabled);

  const iosNeedsInstall = ios && !standalone;

  return (
    <Card>
      <CardTitle className="mb-1">Rest timer</CardTitle>
      <p className="mb-2 text-sm text-muted">
        The timer always chimes and vibrates in the app. A notification can also alert you when the
        app is in the background.
      </p>
      {iosNeedsInstall ? (
        <p className="text-sm">
          On iPhone, notifications need the app installed on your Home Screen. Until then
          you&apos;ll get the alert as soon as you switch back to the app.
        </p>
      ) : !supported ? (
        <p className="text-sm">
          This browser doesn&apos;t support notifications — in-app alerts only.
        </p>
      ) : (
        <Switch
          label="Background notifications"
          description="Best effort: some phones delay alerts for apps in the background."
          checked={enabled}
          onChange={(next) => {
            void setNotificationsEnabled(next).then((granted) => {
              setEnabled(next && granted);
              if (next && !granted)
                toast.error("Notifications are blocked in your browser settings.");
            });
          }}
        />
      )}
    </Card>
  );
}
