"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type ToastVariant = "info" | "success" | "warning" | "danger";

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Milliseconds before auto-dismiss. Default 5000. */
  duration?: number;
};

type ToastItem = Required<Omit<ToastOptions, "description">> & {
  id: number;
  description?: string;
};

type ToastContextValue = {
  /** Show a toast; returns its id. */
  toast: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const variants: Record<ToastVariant, string> = {
  info: "border-l-primary",
  success: "border-l-success",
  warning: "border-l-warning",
  danger: "border-l-danger",
};

/**
 * Wrap the app once (root layout) so any client component can call `useToast()`.
 * Toasts render in a polite live region and dismiss themselves after `duration`.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { variant: "info", duration: 5000, ...options, id }]);
    return id;
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((t) => (
          <Toast key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext>
  );
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), item.duration);
    return () => clearTimeout(timer);
  }, [item.id, item.duration, onDismiss]);

  return (
    <div
      className={cn(
        "border-border bg-background text-foreground pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border border-l-4 p-4 text-sm shadow-lg",
        variants[item.variant],
      )}
    >
      <div className="flex-1">
        <p className="font-semibold">{item.title}</p>
        {item.description ? <p className="text-muted-foreground mt-1">{item.description}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        className="text-muted-foreground hover:bg-muted hover:text-foreground -m-1 rounded-md p-1"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

/** Access the toast API. Must be used inside `<ToastProvider>`. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast() must be used inside <ToastProvider>");
  return ctx;
}
