// REFERENCE SLICE: copy & rename (see docs/COMPETITION_ADAPTATION_GUIDE.md)
import { apiHandler, created, paginated, parseJson, parseQuery } from "@/lib/api/server";
import { createItemSchema, listItemsQuerySchema } from "@/lib/validation/items";
import { requireUser } from "@/server/auth/session";
import { createItem, listItems } from "@/server/services/items";

/** GET /api/items?page&pageSize&q&sort&order&status — paginated, owner-scoped. */
export const GET = apiHandler(async (req) => {
  const user = await requireUser();
  const query = await parseQuery(req, listItemsQuerySchema);
  const { rows, meta } = await listItems(user, query);
  return paginated(rows, meta);
});

/** POST /api/items — create an item owned by the caller. */
export const POST = apiHandler(async (req) => {
  const user = await requireUser();
  const input = await parseJson(req, createItemSchema);
  return created(await createItem(user, input));
});
