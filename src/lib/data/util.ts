import type { ZodType } from "zod";
import { errorCode, reportError } from "@/lib/monitoring";
import { toast } from "@/lib/toast";

/** Validate a Firestore document on read. Invalid docs are reported and skipped, never thrown. */
export function parseDoc<T>(
  schema: ZodType<T>,
  id: string,
  data: unknown,
  where: string,
): (T & { id: string }) | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    reportError(result.error, { where, id });
    return null;
  }
  return { ...result.data, id };
}

/**
 * Run a Firestore write without awaiting it. Writes apply to the local cache immediately; the
 * promise only settles on server ack (never, while offline). Failures are reported + toasted.
 */
export function fireAndForget(write: Promise<unknown>, where: string, userMessage?: string): void {
  write.catch((error: unknown) => {
    reportError(error, { where });
    const denied = errorCode(error) === "permission-denied";
    toast.error(
      denied
        ? "The server rejected a change (permission denied). It has been rolled back."
        : (userMessage ?? "Couldn't save a change. Please try again."),
    );
  });
}

/** Lowercase, dash-separated id from a display name: "Incline DB Press" → "incline-db-press". */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** First free id for `name` given ids already in use: squat, squat-2, squat-3… */
export function uniqueSlug(name: string, taken: ReadonlySet<string>): string {
  const base = slugify(name) || "exercise";
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
