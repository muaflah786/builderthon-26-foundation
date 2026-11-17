import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Table wrapped in a horizontally scrollable container (keeps 360px screens usable). */
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="border-border w-full overflow-x-auto rounded-md border">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("bg-muted", className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn("[&>tr:last-child]:border-0", className)} {...props} />;
}

export function TableFooter({ className, ...props }: ComponentProps<"tfoot">) {
  return (
    <tfoot className={cn("border-border bg-muted border-t font-medium", className)} {...props} />
  );
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("border-border border-b", className)} {...props} />;
}

export function TableHead({ className, scope = "col", ...props }: ComponentProps<"th">) {
  return (
    <th
      scope={scope}
      className={cn(
        "text-muted-foreground h-10 px-3 text-left align-middle font-medium",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-3 py-2 align-middle", className)} {...props} />;
}

export function TableCaption({ className, ...props }: ComponentProps<"caption">) {
  return <caption className={cn("text-muted-foreground mt-3 text-sm", className)} {...props} />;
}
