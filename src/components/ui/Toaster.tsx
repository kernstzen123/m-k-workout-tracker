"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToastStore } from "@/lib/toast";
import { cn } from "@/lib/cn";

const ICONS = { info: Info, success: CheckCircle2, error: XCircle };

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-50 flex flex-col items-center gap-2 p-3"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border bg-surface px-3 py-2 shadow-lg",
              t.kind === "error" ? "border-danger/50" : "border-border",
            )}
          >
            <Icon
              aria-hidden
              className={cn(
                "size-5 shrink-0",
                t.kind === "error"
                  ? "text-danger"
                  : t.kind === "success"
                    ? "text-success"
                    : "text-muted",
              )}
            />
            <p className="flex-1 text-sm">{t.message}</p>
            {t.action ? (
              <button
                type="button"
                className="min-h-10 rounded-lg px-2 text-sm font-semibold text-accent"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Dismiss"
              className="inline-flex size-10 items-center justify-center rounded-lg text-muted"
              onClick={() => dismiss(t.id)}
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
