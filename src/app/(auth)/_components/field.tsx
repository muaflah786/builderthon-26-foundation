import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type FieldProps = ComponentProps<"input"> & {
  name: string;
  label: string;
  errors?: string[];
};

/**
 * Minimal labelled input with an accessible error message. Kept deliberately plain:
 * the coordinator swaps in T2's FormField/Input at integration.
 */
export function Field({ name, label, errors, className, ...props }: FieldProps) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  const error = errors?.[0];
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "border-border bg-background focus-visible:ring-primary rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:opacity-60",
          error && "border-danger",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-danger text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="border-danger text-danger rounded-md border px-3 py-2 text-sm">
      {message}
    </p>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}

/** Turns a Better Auth client error into a user-facing message. */
export function authErrorMessage(error: { status?: number; message?: string }): string {
  if (error.status === 429) return "Too many attempts. Please wait a minute and try again.";
  return error.message || "Something went wrong. Please try again.";
}
