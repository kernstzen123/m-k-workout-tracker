import { useSyncExternalStore } from "react";
import { THEME_KEY } from "./themeScript";

export type ThemePref = "dark" | "light" | "system";
export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "system" ? v : "dark";
  } catch {
    return "dark";
  }
}

export function applyThemePref(pref: ThemePref): void {
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {
    // Storage unavailable (private mode) — theme still applies for this page view.
  }
  const resolved =
    pref === "system"
      ? matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : pref;
  document.documentElement.dataset.theme = resolved;
  window.dispatchEvent(new Event(THEME_EVENT));
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", resolved === "light" ? "#f5efe3" : "#0a1612");
}

const THEME_EVENT = "mk-theme-change";

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Current theme preference as React state ("dark" during SSR). */
export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, getThemePref, () => "dark");
}
