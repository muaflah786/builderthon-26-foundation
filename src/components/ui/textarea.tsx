import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { controlClasses } from "@/components/ui/input";

export function Textarea({ className, rows = 4, ...props }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cn(controlClasses, "py-2", className)} {...props} />;
}
