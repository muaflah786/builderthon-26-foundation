// REFERENCE SLICE: copy & rename (see docs/COMPETITION_ADAPTATION_GUIDE.md)
import { z } from "zod";
import { listQuerySchema } from "@/lib/validation/common";

/** Shared by the item forms (client) and the /api/items handlers (server). */

export const ITEM_STATUSES = ["open", "in_progress", "done"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
};

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const title = z
  .string("Title is required")
  .trim()
  .min(1, "Title is required")
  .max(200, "Title must be at most 200 characters");

/** "" (cleared textarea) → null, so an edit can remove the description. */
const description = z
  .preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(5000, "Description must be at most 5000 characters").nullable(),
  )
  .optional();

const status = z.enum(ITEM_STATUSES, "Choose a valid status");

export const createItemSchema = z.object({
  title,
  description,
  status: status.default("open"),
});
export type CreateItemInput = z.output<typeof createItemSchema>;

export const updateItemSchema = z
  .object({ title: title.optional(), description, status: status.optional() })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nothing to update");
export type UpdateItemInput = z.output<typeof updateItemSchema>;

export const ITEM_SORT_FIELDS = ["createdAt", "updatedAt", "title"] as const;

export const listItemsQuerySchema = listQuerySchema(ITEM_SORT_FIELDS).extend({
  // "" comes from the "All statuses" option of the GET filter form.
  status: z.preprocess(emptyToUndefined, status.optional()),
});
export type ListItemsQuery = z.output<typeof listItemsQuerySchema>;

/** Shape returned by the API and services (dates as ISO strings). */
export type ItemDto = {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
};
