import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type EmptyStateProps = Omit<ComponentProps<"div">, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  /** Optional call to action, e.g. a "Create" button or link. */
  action?: ReactNode;
  /** Optional decorative icon (inline SVG). */
  icon?: ReactNode;
};

/** Placeholder for an empty list or search with no results. */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "border-border flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="text-muted-foreground mb-1" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? <p className="text-muted-foreground max-w-sm text-sm">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
