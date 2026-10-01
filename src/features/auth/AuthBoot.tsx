"use client";

import { useEffect } from "react";
import { useAuthStore } from "./store";

/** Starts the Firebase Auth listener once for the whole app. */
export function AuthBoot() {
  const start = useAuthStore((s) => s.start);
  useEffect(() => start(), [start]);
  return null;
}
