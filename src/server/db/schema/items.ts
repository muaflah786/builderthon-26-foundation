// REFERENCE SLICE: copy & rename (see docs/COMPETITION_ADAPTATION_GUIDE.md)
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { ITEM_STATUSES } from "@/lib/validation/items";
import { idColumn, timestamps } from "@/server/db/columns";
import { user } from "@/server/db/schema/auth";

export const items = sqliteTable(
  "items",
  {
    id: idColumn(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", { enum: ITEM_STATUSES }).notNull().default("open"),
    ...timestamps(),
  },
  (t) => [
    // Leading owner_id also serves "WHERE owner_id = ?" on its own.
    index("items_owner_created_idx").on(t.ownerId, t.createdAt),
    index("items_status_idx").on(t.status),
  ],
);

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
