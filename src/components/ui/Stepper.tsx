"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export interface StepperProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
}

/** − value + control. The label is announced with the value for screen readers. */
export function Stepper({
  label,
  value,
  min = 0,
  max = 99,
  step = 1,
  onChange,
  className,
}: StepperProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex items-center rounded-xl border border-border-strong bg-surface-2",
        className,
      )}
    >
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
        className="inline-flex size-11 items-center justify-center rounded-l-xl text-fg transition-colors hover:bg-surface-3 active:bg-surface-3 disabled:opacity-40"
      >
        <Minus aria-hidden className="size-4" />
      </button>
      <output
        aria-live="polite"
        className="tabular min-w-8 text-center font-display text-lg font-semibold"
      >
        {value}
      </output>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
        className="inline-flex size-11 items-center justify-center rounded-r-xl text-fg transition-colors hover:bg-surface-3 active:bg-surface-3 disabled:opacity-40"
      >
        <Plus aria-hidden className="size-4" />
      </button>
    </div>
  );
}

/** Compact numeric input with a visible label (used in dense rows). */
export function MiniNumber({
  label,
  value,
  onChange,
  decimal,
  className,
  hideLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  decimal?: boolean;
  className?: string;
  hideLabel?: boolean;
}) {
  return (
    <label className={cn("flex flex-col items-center gap-0.5", className)}>
      <span className={cn("text-xs font-semibold text-muted", hideLabel && "sr-only")}>
        {label}
      </span>
      <input
        inputMode={decimal ? "decimal" : "numeric"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        className="tabular h-11 w-full min-w-12 rounded-xl border border-border-strong bg-surface-2 text-center font-display text-lg font-semibold transition-colors focus-visible:border-accent"
      />
    </label>
  );
}
