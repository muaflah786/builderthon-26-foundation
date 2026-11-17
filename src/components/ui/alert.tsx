import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AlertVariant = "info" | "success" | "warning" | "danger";

// Tinted background + coloured left edge; body text stays `text-foreground` for AA contrast.
const variants: Record<AlertVariant, string> = {
  info: "border-primary bg-primary/10",
  success: "border-success bg-success/10",
  warning: "border-warning bg-warning/10",
  danger: "border-danger bg-danger/10",
};

export type AlertProps = Omit<ComponentProps<"div">, "title"> & {
  variant?: AlertVariant;
  title?: ReactNode;
};

/**
 * Inline message. `danger` uses `role="alert"` (announced immediately);
 * other variants use `role="status"` (announced politely).
 */
export function Alert({ variant = "info", title, className, children, ...props }: AlertProps) {
  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={cn(
        "text-foreground rounded-md border border-l-4 px-4 py-3 text-sm",
        variants[variant],
        className,
      )}
      {...props}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={cn(title ? "mt-1" : undefined)}>{children}</div> : null}
    </div>
  );
}
