export const OUR_WORKER = "/serwist/sw.js";

/**
 * Should a service-worker registration be removed on startup?
 * - Development: always (the app never runs its worker in dev; any worker is stale).
 * - Production: only when its script is known and isn't ours. A registration that has no
 *   worker yet (script still downloading right after `register()`) is ours in progress — keep it.
 */
export function shouldRemoveWorker(scriptURL: string | undefined, dev: boolean): boolean {
  if (dev) return true;
  if (!scriptURL) return false;
  try {
    return new URL(scriptURL).pathname !== OUR_WORKER;
  } catch {
    return false;
  }
}
