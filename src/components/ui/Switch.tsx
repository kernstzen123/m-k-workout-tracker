import { cn } from "@/lib/cn";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

/** Full-row toggle (whole row is the tap target). */
export function Switch({ checked, onChange, label, description }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center gap-4 text-left"
    >
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        {description ? <span className="block text-sm text-muted">{description}</span> : null}
      </span>
      <span
        aria-hidden
        className={cn(
          "relative h-8 w-14 shrink-0 rounded-full border transition",
          checked ? "border-accent bg-accent" : "border-border bg-surface-3",
        )}
      >
        <span
          className={cn(
            "absolute top-1 size-5.5 rounded-full transition-all",
            checked ? "left-7 bg-accent-fg" : "left-1 bg-muted",
          )}
        />
      </span>
    </button>
  );
}
