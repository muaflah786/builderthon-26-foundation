// REFERENCE SLICE: copy & rename (see docs/COMPETITION_ADAPTATION_GUIDE.md)
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteItemButton } from "@/components/items/delete-item-button";
import { ItemForm } from "@/components/items/item-form";
import { ItemStatusBadge } from "@/components/items/item-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAppError } from "@/lib/errors";
import { requireUser } from "@/server/auth/session";
import type { ItemDto } from "@/lib/validation/items";
import { getItem } from "@/server/services/items";

export const metadata: Metadata = { title: "Item" };

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

/** Detail + edit on one page. Missing or not-owned items render the 404 page. */
export default async function ItemPage({ params }: PageProps<"/app/items/[id]">) {
  const user = await requireUser();
  const { id } = await params;

  let item: ItemDto;
  try {
    item = await getItem(user, id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Link href="/app/items" className="text-muted-foreground text-sm hover:underline">
        ← Back to items
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{item.title}</h1>
          <ItemStatusBadge status={item.status} />
        </div>
        <DeleteItemButton id={item.id} title={item.title} />
      </div>
      <p className="text-muted-foreground text-sm">
        Created {dateFormat.format(new Date(item.createdAt))} · Updated{" "}
        {dateFormat.format(new Date(item.updatedAt))}
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Edit</CardTitle>
        </CardHeader>
        <CardContent>
          {/* key resets the uncontrolled inputs after a save + refresh */}
          <ItemForm key={item.updatedAt} item={item} />
        </CardContent>
      </Card>
    </div>
  );
}
