import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Shared look for text-like controls (Input, Textarea, Select). */
export const controlClasses =
  "w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger";

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return <input type={type} className={cn(controlClasses, "h-10", className)} {...props} />;
}
