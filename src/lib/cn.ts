/** Join class names, skipping falsy values. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Stable empty array for store-selector fallbacks (`?? EMPTY`). A fresh `[]` in a selector is a
 * new snapshot on every call, which makes React re-render forever.
 */
export const EMPTY: readonly never[] = Object.freeze([]);
