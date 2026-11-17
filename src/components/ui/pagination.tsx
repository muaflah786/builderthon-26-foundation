"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import type { PageMeta } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";

/**
 * Build the href for `page`, keeping every other search param (filters, sort, q).
 * Page 1 drops the `page` param so the canonical URL stays clean.
 */
export function pageHref(
  pathname: string,
  searchParams: URLSearchParams | { toString(): string },
  page: number,
) {
  const params = new URLSearchParams(searchParams.toString());
  if (page <= 1) params.delete("page");
  else params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export type PaginationProps = Omit<ComponentProps<"nav">, "children"> & { meta: PageMeta };

/**
 * URL-driven pagination: links change only `?page=` and keep the other params.
 * Uses `useSearchParams`, so on a statically rendered page wrap it in `<Suspense>`
 * (list pages that read `searchParams` are dynamic and need no wrapper).
 */
export function Pagination({ meta, className, ...props }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { page, totalPages } = meta;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const linkClass = buttonClasses({ variant: "secondary", size: "sm" });

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-between gap-3", className)}
      {...props}
    >
      {hasPrev ? (
        <Link href={pageHref(pathname, searchParams, page - 1)} rel="prev" className={linkClass}>
          Previous
        </Link>
      ) : (
        <span aria-disabled="true" className={linkClass}>
          Previous
        </span>
      )}
      <p className="text-muted-foreground text-sm">
        Page {page} of {totalPages}
      </p>
      {hasNext ? (
        <Link href={pageHref(pathname, searchParams, page + 1)} rel="next" className={linkClass}>
          Next
        </Link>
      ) : (
        <span aria-disabled="true" className={linkClass}>
          Next
        </span>
      )}
    </nav>
  );
}
