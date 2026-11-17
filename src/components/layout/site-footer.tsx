import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function SiteFooter({
  appName,
  className,
  ...props
}: ComponentProps<"footer"> & { appName: string }) {
  return (
    <footer className={cn("border-border border-t", className)} {...props}>
      <div className="text-muted-foreground mx-auto w-full max-w-6xl px-4 py-6 text-sm">
        © {new Date().getFullYear()} {appName}
      </div>
    </footer>
  );
}
