import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";

/** Top-level form error (e.g. `formError` from `useApiForm`). Renders nothing when empty. */
export function FormError({
  message,
  title,
  className,
}: {
  message?: string | null;
  title?: ReactNode;
  className?: string;
}) {
  if (!message) return null;
  return (
    <Alert variant="danger" title={title} className={className}>
      {message}
    </Alert>
  );
}
