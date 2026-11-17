import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { controlClasses } from "@/components/ui/input";

/** Native `<select>`. Pass `<option>` children. */
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(controlClasses, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  );
}
