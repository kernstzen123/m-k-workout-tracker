"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/monitoring";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => reportError(error, { where: "global error boundary" }), [error]);

  return (
    <html lang="en">
      <body style={{ background: "#0b0d10", color: "#f2f4f7", fontFamily: "system-ui" }}>
        <main style={{ padding: 24, textAlign: "center" }}>
          <h1>Something went wrong</h1>
          <p>Your logged data is stored on this device. Reload to continue.</p>
          <button type="button" onClick={reset} style={{ minHeight: 48, padding: "0 24px" }}>
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
