import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  eyebrow,
  action,
  children,
}: {
  title: string;
  /** Small letter-spaced label above the title. */
  eyebrow?: string;
  action?: ReactNode;
  /** Controls that stick with the header (search, filters). */
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-4 flex flex-col gap-3 bg-bg/92 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 backdrop-blur-md">
      <div className="flex min-h-12 items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="truncate font-display text-[2rem] leading-tight font-semibold tracking-wide uppercase">
            {title}
          </h1>
        </div>
        {action}
      </div>
      {children}
    </header>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-surface p-4", className)}>
      {children}
    </section>
  );
}

/** Card heading in the brand "eyebrow" style. */
export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("eyebrow mb-3", className)}>{children}</h2>;
}

/** Big condensed number with a label — used for quick stats. */
export function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="eyebrow">{label}</p>
      <p className="tabular flex items-center gap-1.5 font-display text-3xl font-semibold">
        {icon}
        {value}
      </p>
    </Card>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icon ? (
        <div className="flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent [&_svg]:size-8">
          {icon}
        </div>
      ) : null}
      <p className="font-display text-xl font-semibold tracking-wide uppercase">{title}</p>
      {children ? <div className="max-w-xs text-muted">{children}</div> : null}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center p-8">
      <span
        aria-hidden
        className="size-8 animate-spin rounded-full border-4 border-surface-3 border-t-accent"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Decorative divider from the logo: line · heart · line. */
export function HeartDivider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("flex items-center justify-center gap-3 text-accent", className)}
    >
      <span className="h-px w-12 bg-current opacity-70" />
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z" />
      </svg>
      <span className="h-px w-12 bg-current opacity-70" />
    </div>
  );
}
