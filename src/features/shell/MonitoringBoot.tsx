"use client";

import { useEffect } from "react";
import { initMonitoring } from "@/lib/monitoring";

/** Starts error monitoring (Sentry) once, after the app has hydrated — off the critical path. */
export function MonitoringBoot() {
  useEffect(() => {
    // Load after the browser is idle so it never competes with first paint.
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(initMonitoring);
    else setTimeout(initMonitoring, 2000);
  }, []);
  return null;
}
