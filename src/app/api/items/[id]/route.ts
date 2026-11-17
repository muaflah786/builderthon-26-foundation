// REFERENCE SLICE: copy & rename (see docs/COMPETITION_ADAPTATION_GUIDE.md)
import { apiHandler, noContent, ok, parseJson, parseParams } from "@/lib/api/server";
import { idParamSchema } from "@/lib/validation/common";
import { updateItemSchema } from "@/lib/validation/items";
import { requireUser } from "@/server/auth/session";
import { deleteItem, getItem, updateItem } from "@/server/services/items";

type Ctx = RouteContext<"/api/items/[id]">;

/** GET /api/items/:id — 404 when missing or not accessible. */
export const GET = apiHandler(async (_req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await parseParams(ctx.params, idParamSchema);
  return ok(await getItem(user, id));
});

/** PATCH /api/items/:id — partial update. */
export const PATCH = apiHandler(async (req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await parseParams(ctx.params, idParamSchema);
  const input = await parseJson(req, updateItemSchema);
  return ok(await updateItem(user, id, input));
});

/** DELETE /api/items/:id — 204 on success. */
export const DELETE = apiHandler(async (_req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await parseParams(ctx.params, idParamSchema);
  await deleteItem(user, id);
  return noContent();
});
