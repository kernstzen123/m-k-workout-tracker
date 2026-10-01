import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-3 flex min-h-14 items-center justify-between gap-2 bg-bg/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {action}
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
      {icon ? <div className="text-muted [&_svg]:size-10">{icon}</div> : null}
      <p className="text-lg font-semibold">{title}</p>
      {children ? <div className="text-muted">{children}</div> : null}
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
