import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type SpinnerProps = ComponentProps<"span"> & {
  /**
   * Accessible label. When set, the spinner is announced (`role="status"`).
   * Leave it out when the spinner is decorative (e.g. inside a busy `Button`).
   */
  label?: string;
  size?: "sm" | "md" | "lg";
};

const sizes = { sm: "size-4", md: "size-5", lg: "size-8" } as const;

/** Animated loading indicator. Inherits the current text colour. */
export function Spinner({ label, size = "md", className, ...props }: SpinnerProps) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-hidden={label ? undefined : true}
      className={cn("inline-flex items-center", className)}
      {...props}
    >
      <svg
        className={cn("animate-spin motion-reduce:animate-none", sizes[size])}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
        <path
          d="M22 12a10 10 0 0 0-10-10"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
