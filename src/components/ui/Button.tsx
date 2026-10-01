import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:brightness-110 active:brightness-95",
  secondary: "bg-surface-2 text-fg border border-border hover:bg-surface-3",
  ghost: "bg-transparent text-fg hover:bg-surface-2",
  danger: "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
};

const SIZES: Record<Size, string> = {
  md: "min-h-12 px-4 text-base",
  lg: "min-h-14 px-6 text-lg",
};

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
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition select-none",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className,
      )}
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
      className={cn(
        "inline-flex size-12 shrink-0 items-center justify-center rounded-xl transition",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
