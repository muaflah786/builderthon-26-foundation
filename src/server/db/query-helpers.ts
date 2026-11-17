import { asc, desc, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { pageOffset } from "@/lib/validation/common";

/**
 * Generic list-query helpers (search, sort, pagination). Reused by every resource.
 *
 *   const where = and(eq(t.ownerId, user.id), q ? containsInsensitive(t.title, q) : undefined);
 *   db.select().from(t).where(where)
 *     .orderBy(orderByFrom({ createdAt: t.createdAt, title: t.title }, sort, order), asc(t.id))
 *     .limit(pageSize).offset(pageOffset(page, pageSize));
 */

/** Escapes LIKE wildcards so user input matches literally. Use with `ESCAPE '\'`. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/** Case-insensitive "column contains text" (parameterized; wildcards escaped). */
export function containsInsensitive(column: AnyColumn | SQL, text: string): SQL {
  const pattern = `%${escapeLike(text.toLowerCase())}%`;
  return sql`lower(${column}) like ${pattern} escape '\\'`;
}

/** Maps an allow-listed sort key to an ORDER BY expression. */
export function orderByFrom<K extends string>(
  columns: Record<K, AnyColumn>,
  sort: K,
  order: "asc" | "desc",
): SQL {
  const column = columns[sort];
  return order === "asc" ? asc(column) : desc(column);
}

/** `{ limit, offset }` for a 1-based page. */
export function pageWindow(page: number, pageSize: number) {
  return { limit: pageSize, offset: pageOffset(page, pageSize) };
}
