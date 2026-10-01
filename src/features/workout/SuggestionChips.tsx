"use client";

import { ArrowDownRight, Lightbulb, Plus, Repeat, TrendingUp, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Suggestion } from "@/lib/overload/suggest";

const ICONS: Record<Suggestion["kind"], LucideIcon> = {
  "increase-weight": TrendingUp,
  "add-rep": Plus,
  repeat: Repeat,
  deload: ArrowDownRight,
  variation: Lightbulb,
};

export function suggestionLabel(s: Suggestion): string {
  switch (s.kind) {
    case "increase-weight":
      return `Go up: ${s.weightKg} kg × ${s.reps}`;
    case "add-rep":
      return `+1 rep: set ${s.setIndex + 1} → ${s.weightKg} kg × ${s.reps}`;
    case "repeat":
      return `Repeat ${s.weightKg} kg`;
    case "deload":
      return `Deload: ${s.weightKg} kg`;
    case "variation":
      return "Try a variation";
  }
}

/**
 * Overload suggestions as dismissible chips. "Apply" only fills the not-yet-logged rows —
 * nothing is ever applied automatically.
 */
export function SuggestionChips({
  suggestions,
  onApply,
  onDismiss,
}: {
  suggestions: Suggestion[];
  onApply: (s: Suggestion) => void;
  onDismiss: (s: Suggestion) => void;
}) {
  if (suggestions.length === 0) return null;
  return (
    <ul aria-label="Suggestions" className="mb-2 flex flex-col gap-1.5">
      {suggestions.map((s) => {
        const Icon = ICONS[s.kind];
        return (
          <li
            key={s.kind}
            className="flex items-center gap-2 rounded-xl border border-accent/40 bg-accent-soft py-1 pr-1 pl-3"
          >
            <Icon aria-hidden className="size-4 shrink-0 text-accent" />
            <div className="min-w-0 flex-1 py-1">
              <p className="text-sm font-semibold">{suggestionLabel(s)}</p>
              <p className="text-xs text-muted">{s.reason}</p>
            </div>
            {s.kind !== "variation" ? (
              <button
                type="button"
                onClick={() => onApply(s)}
                className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-accent transition-colors hover:bg-surface-2 active:bg-surface-3"
              >
                Apply
              </button>
            ) : null}
            <button
              type="button"
              aria-label={`Dismiss suggestion: ${suggestionLabel(s)}`}
              onClick={() => onDismiss(s)}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2"
            >
              <X aria-hidden className="size-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
