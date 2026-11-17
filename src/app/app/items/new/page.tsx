// REFERENCE SLICE: copy & rename (see docs/COMPETITION_ADAPTATION_GUIDE.md)
import type { Metadata } from "next";
import Link from "next/link";
import { ItemForm } from "@/components/items/item-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "New item" };

export default function NewItemPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Link href="/app/items" className="text-muted-foreground text-sm hover:underline">
        ← Back to items
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">New item</h1>
      <Card>
        <CardContent className="pt-6">
          <ItemForm />
        </CardContent>
      </Card>
    </div>
  );
}
