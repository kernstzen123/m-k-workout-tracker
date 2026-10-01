import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

/** Toggle chip (filters, multi-select). Exposes its state via aria-pressed. */
export function Chip({ selected, className, children, type = "button", ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition",
        selected
          ? "border-accent bg-accent text-accent-fg"
          : "border-border bg-surface-2 text-fg hover:bg-surface-3",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Non-interactive label. */
export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-surface-3 px-2 py-0.5 text-xs font-medium text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
