/**
 * Central error reporting. Every caught error must go through `reportError` — no silent failures.
 *
 * Errors always go to the console. When `NEXT_PUBLIC_SENTRY_DSN` is set, the Sentry browser SDK is
 * loaded lazily (so it costs nothing when unused) and receives them too. Errors reported before
 * the SDK has loaded are queued (bounded) and flushed once it's ready.
 */

// Type-only (erased at build): the SDK itself is loaded with a dynamic import below.
import type * as SentryNs from "@sentry/browser";

type SentryModule = typeof SentryNs;
type Context = Record<string, unknown>;

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const MAX_QUEUE = 20;

let sentry: SentryModule | null = null;
let loading: Promise<void> | null = null;
const queue: Array<{ error: unknown; context?: Context }> = [];

function send(s: SentryModule, error: unknown, context?: Context) {
  s.withScope((scope) => {
    if (context) {
      const { where, ...extra } = context;
      if (typeof where === "string") scope.setTag("where", where);
      scope.setExtras(extra);
    }
    s.captureException(error instanceof Error ? error : new Error(String(error)));
  });
}

/** Start Sentry if configured. Safe to call more than once; no-op on the server. */
export function initMonitoring(): void {
  if (!DSN || typeof window === "undefined" || loading) return;
  loading = import("@sentry/browser")
    .then((s) => {
      s.init({
        dsn: DSN,
        release: process.env.NEXT_PUBLIC_APP_VERSION,
        environment: process.env.NODE_ENV,
        // Errors only: no performance tracing, no session replay — stays well inside the free tier.
        tracesSampleRate: 0,
        beforeSend(event) {
          // Never send who the user is; the app has exactly two known users anyway.
          delete event.user;
          if (event.request) {
            delete event.request.cookies;
            delete event.request.headers;
          }
          return event;
        },
      });
      sentry = s;
      for (const item of queue.splice(0)) send(s, item.error, item.context);
    })
    .catch((error: unknown) => {
      // Ad blockers often block Sentry; that must never break the app.
      console.warn("[mk-workout] Sentry failed to load", error);
    });
}

export function reportError(error: unknown, context?: Context): void {
  console.error("[mk-workout]", error, context ?? "");
  if (!DSN) return;
  if (sentry) send(sentry, error, context);
  else if (queue.length < MAX_QUEUE) queue.push({ error, context });
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
