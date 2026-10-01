import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

/** Pressed feedback is a colour change only (no transforms), so layout never shifts. */
const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-strong active:bg-accent-strong",
  secondary:
    "border border-border-strong bg-surface-2 text-fg hover:bg-surface-3 active:bg-surface-3",
  ghost: "bg-transparent text-fg hover:bg-surface-2 active:bg-surface-3",
  danger: "border border-danger/50 bg-danger/12 text-danger hover:bg-danger/20 active:bg-danger/25",
};

const SIZES: Record<Size, string> = {
  md: "min-h-12 px-4 text-base",
  lg: "min-h-14 px-6 text-lg",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors select-none " +
  "disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-5 [&_svg]:shrink-0";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  block,
  icon,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(BASE, VARIANTS[variant], SIZES[size], block && "w-full", className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only buttons need an accessible name. */
  label: string;
  variant?: Variant;
}

export function IconButton({
  label,
  variant = "ghost",
  className,
  children,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(BASE, "size-12 shrink-0 px-0 [&_svg]:size-6", VARIANTS[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
}
