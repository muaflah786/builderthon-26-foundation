// REFERENCE SLICE: copy & rename (see docs/COMPETITION_ADAPTATION_GUIDE.md)
import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ITEM_STATUSES, ITEM_STATUS_LABELS, type ListItemsQuery } from "@/lib/validation/items";

/**
 * Search / filter / sort as a plain GET form: state lives in the URL, works
 * without JavaScript, and submitting resets to page 1 (no `page` field).
 */
export function ItemFilters({ query }: { query: ListItemsQuery }) {
  const sortValue = `${query.sort}:${query.order}`;
  return (
    <form method="get" role="search" className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="items-q">Search</Label>
        <Input
          id="items-q"
          name="q"
          type="search"
          defaultValue={query.q ?? ""}
          placeholder="Title or description"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="items-status">Status</Label>
        <Select id="items-status" name="status" defaultValue={query.status ?? ""}>
          <option value="">All statuses</option>
          {ITEM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ITEM_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="items-sort">Sort</Label>
        {/* One select drives two params via the hidden inputs pattern below. */}
        <Select id="items-sort" name="sortOrder" defaultValue={sortValue}>
          <option value="createdAt:desc">Newest first</option>
          <option value="createdAt:asc">Oldest first</option>
          <option value="updatedAt:desc">Recently updated</option>
          <option value="title:asc">Title A–Z</option>
          <option value="title:desc">Title Z–A</option>
        </Select>
      </div>
      <div className="flex items-end gap-2">
        <Button type="submit" variant="secondary">
          Apply
        </Button>
        <Link href="?" className={buttonClasses({ variant: "ghost" })}>
          Reset
        </Link>
      </div>
    </form>
  );
}

/** Splits the combined `sortOrder=field:dir` form value into `sort` + `order`. */
export function splitSortOrder(params: Record<string, string | string[] | undefined>) {
  const raw = params.sortOrder;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return params;
  const [sort, order] = value.split(":");
  return { ...params, sort, order };
}
