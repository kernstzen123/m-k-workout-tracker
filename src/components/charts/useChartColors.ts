"use client";

import { useSyncExternalStore } from "react";

export interface ChartColors {
  series1: string;
  series2: string;
  grid: string;
  surface: string;
  text: string;
  muted: string;
  bandFill: string;
}

const FALLBACK: ChartColors = {
  series1: "#3da97b",
  series2: "#ae5528",
  grid: "#23392f",
  surface: "#0f1f19",
  text: "#eee1cb",
  muted: "#a3b5aa",
  bandFill: "rgb(127 176 154 / 0.14)",
};

let cache: { key: string; value: ChartColors } | null = null;

function read(): ChartColors {
  const root = document.documentElement;
  const key = root.dataset.theme ?? "dark";
  if (cache?.key === key) return cache.value;
  const css = getComputedStyle(root);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const value: ChartColors = {
    series1: v("--chart-1", FALLBACK.series1),
    series2: v("--chart-2", FALLBACK.series2),
    grid: v("--chart-grid", FALLBACK.grid),
    surface: v("--surface", FALLBACK.surface),
    text: v("--fg", FALLBACK.text),
    muted: v("--muted", FALLBACK.muted),
    bandFill: v("--accent-soft", FALLBACK.bandFill),
  };
  cache = { key, value };
  return value;
}

function subscribe(onChange: () => void) {
  // The theme is a data attribute on <html>; watch it directly.
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/**
 * Resolved chart colors for the current theme. SVG presentation attributes (Recharts) can't
 * resolve CSS variables, so the tokens are read from the computed style and re-read on theme change.
 */
export function useChartColors(): ChartColors {
  return useSyncExternalStore(subscribe, read, () => FALLBACK);
}
