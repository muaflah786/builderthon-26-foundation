import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Native checkbox. Pair it with a `<Label>` (or wrap both in a `<label>`). */
export function Checkbox({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return (
    <input
      type="checkbox"
      className={cn(
        "border-input accent-primary size-4 shrink-0 rounded-sm disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
