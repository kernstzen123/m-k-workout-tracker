/**
 * Central error reporting. Every caught error must go through `reportError` — no silent failures.
 * Sentry is wired in Phase 6 behind NEXT_PUBLIC_SENTRY_DSN; until then this logs to the console.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  console.error("[mk-workout]", error, context ?? "");
}

/** Firebase error code (e.g. `permission-denied`), if the error carries one. */
export function errorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
