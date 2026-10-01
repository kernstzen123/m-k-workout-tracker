import { create } from "zustand";

export type ToastKind = "info" | "success" | "error";
export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">, ttlMs?: number) => number;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast, ttlMs = 4000) => {
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-2), { ...toast, id }] });
    if (ttlMs > 0) setTimeout(() => get().dismiss(id), ttlMs);
    return id;
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/** Imperative helpers usable from anywhere (stores, repositories, event handlers). */
export const toast = {
  info: (message: string) => useToastStore.getState().push({ kind: "info", message }),
  success: (message: string) => useToastStore.getState().push({ kind: "success", message }),
  error: (message: string) => useToastStore.getState().push({ kind: "error", message }, 7000),
};
