import { Check } from "lucide-react";
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
        "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
        selected
          ? "border-accent bg-accent text-accent-fg"
          : "border-border-strong bg-surface text-fg hover:bg-surface-2 active:bg-surface-3",
        className,
      )}
      {...rest}
    >
      {selected ? <Check aria-hidden className="-ml-1 size-4" strokeWidth={2.5} /> : null}
      {children}
    </button>
  );
}

/** Non-interactive label. */
export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold tracking-wide text-accent uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}
