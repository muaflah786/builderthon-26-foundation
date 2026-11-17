import { sql } from "drizzle-orm";
import { integer, text } from "drizzle-orm/sqlite-core";

/**
 * Shared column helpers so every table follows docs/DATABASE_GUIDE.md conventions:
 *   export const things = sqliteTable("things", { id: idColumn(), ...timestamps(), title: text("title").notNull() });
 */

/** Text primary key generated in JS (UUID v4). */
export const idColumn = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

/** created_at / updated_at stored as unix milliseconds, exposed as Date. */
export const timestamps = () => ({
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
    .$onUpdateFn(() => new Date()),
});
