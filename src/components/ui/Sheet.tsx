"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { IconButton } from "./Button";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Bottom sheet built on the native <dialog> element (focus trap, Esc to close, inert background).
 */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) closes the sheet.
        if (e.target === e.currentTarget) onClose();
      }}
      className="sheet m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-2xl border border-border bg-surface p-0 text-fg sm:mx-auto sm:mb-auto sm:max-w-lg sm:rounded-2xl"
    >
      <div className="flex max-h-[92dvh] flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X aria-hidden />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer ? (
          <footer className="border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
