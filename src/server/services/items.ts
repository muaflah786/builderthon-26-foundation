// REFERENCE SLICE: copy & rename (see docs/COMPETITION_ADAPTATION_GUIDE.md)
import "server-only";

import { and, asc, count, eq, or, type SQL } from "drizzle-orm";
import { AppError } from "@/lib/errors";
import { pageMeta } from "@/lib/validation/common";
import type {
  CreateItemInput,
  ItemDto,
  ListItemsQuery,
  UpdateItemInput,
} from "@/lib/validation/items";
import { db } from "@/server/db";
import { containsInsensitive, orderByFrom, pageWindow } from "@/server/db/query-helpers";
import { items, type Item } from "@/server/db/schema/items";
import type { SessionUser } from "@/types/auth";

/**
 * Business logic + authorization for items. Route handlers and pages call these;
 * they never query the table directly.
 *
 * Access rule: users see and change only their own items; admins see all.
 * Someone else's item behaves exactly like a missing one (404), so ids leak nothing.
 */

export type { ItemDto };

function toDto(row: Item): ItemDto {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    description: row.description,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** WHERE clause limiting rows to what `user` may access (undefined = everything). */
function accessScope(user: SessionUser): SQL | undefined {
  return user.role === "admin" ? undefined : eq(items.ownerId, user.id);
}

const sortColumns = {
  createdAt: items.createdAt,
  updatedAt: items.updatedAt,
  title: items.title,
};

export async function listItems(user: SessionUser, query: ListItemsQuery) {
  const where = and(
    accessScope(user),
    query.status ? eq(items.status, query.status) : undefined,
    query.q
      ? or(
          containsInsensitive(items.title, query.q),
          containsInsensitive(items.description, query.q),
        )
      : undefined,
  );
  const { limit, offset } = pageWindow(query.page, query.pageSize);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(items)
      .where(where)
      // id as a tie-breaker keeps pagination stable when sort values are equal.
      .orderBy(orderByFrom(sortColumns, query.sort, query.order), asc(items.id))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(items).where(where),
  ]);

  return { rows: rows.map(toDto), meta: pageMeta(total, query.page, query.pageSize) };
}

async function findAccessible(user: SessionUser, id: string): Promise<Item> {
  const [row] = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), accessScope(user)));
  if (!row) throw AppError.notFound("Item");
  return row;
}

export async function getItem(user: SessionUser, id: string): Promise<ItemDto> {
  return toDto(await findAccessible(user, id));
}

export async function createItem(user: SessionUser, input: CreateItemInput): Promise<ItemDto> {
  const [row] = await db
    .insert(items)
    .values({
      ownerId: user.id,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
    })
    .returning();
  return toDto(row);
}

export async function updateItem(
  user: SessionUser,
  id: string,
  input: UpdateItemInput,
): Promise<ItemDto> {
  await findAccessible(user, id);
  const [row] = await db
    .update(items)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
    })
    .where(eq(items.id, id))
    .returning();
  return toDto(row);
}

export async function deleteItem(user: SessionUser, id: string): Promise<void> {
  await findAccessible(user, id);
  await db.delete(items).where(eq(items.id, id));
}
