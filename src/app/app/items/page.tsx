// REFERENCE SLICE: copy & rename (see docs/COMPETITION_ADAPTATION_GUIDE.md)
import type { Metadata } from "next";
import Link from "next/link";
import { ItemFilters, splitSortOrder } from "@/components/items/item-filters";
import { ItemStatusBadge } from "@/components/items/item-status-badge";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listItemsQuerySchema } from "@/lib/validation/items";
import { requireUser } from "@/server/auth/session";
import { listItems } from "@/server/services/items";

export const metadata: Metadata = { title: "Items" };

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

/** Server-rendered list: reads URL params, validates them, calls the service. */
export default async function ItemsPage({ searchParams }: PageProps<"/app/items">) {
  const user = await requireUser();
  const params = splitSortOrder(await searchParams);
  // Invalid params (hand-edited URL) fall back to defaults instead of crashing.
  const parsed = listItemsQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : listItemsQuerySchema.parse({});
  const { rows, meta } = await listItems(user, query);
  const filtered = Boolean(query.q || query.status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Items</h1>
        <Link href="/app/items/new" className={buttonClasses()}>
          New item
        </Link>
      </div>

      <ItemFilters query={query} />

      {rows.length === 0 ? (
        filtered ? (
          <EmptyState
            title="No matching items"
            description="Try a different search or clear the filters."
            action={
              <Link href="/app/items" className={buttonClasses({ variant: "secondary" })}>
                Clear filters
              </Link>
            }
          />
        ) : (
          <EmptyState
            title="No items yet"
            description="Create your first item to get started."
            action={
              <Link href="/app/items/new" className={buttonClasses()}>
                New item
              </Link>
            }
          />
        )
      ) : (
        <>
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {meta.total} {meta.total === 1 ? "item" : "items"}
          </p>
          <div className="border-border overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-xs truncate font-medium">
                      <Link href={`/app/items/${item.id}`} className="hover:underline">
                        {item.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <ItemStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">
                      {dateFormat.format(new Date(item.createdAt))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination meta={meta} />
        </>
      )}
    </div>
  );
}
