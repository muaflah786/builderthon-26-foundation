import { apiHandler, noContent, parseJson, parseParams } from "@/lib/api/server";
import { closeOperationSchema, opParamsSchema } from "@/lib/validation/ops";
import { requireUser } from "@/server/auth/session";
import { closeOperation } from "@/server/services/ops-closure";

type Ctx = RouteContext<"/api/ops/[id]/close">;

/** POST /api/ops/:id/close — { unfinished: leave | cancel }. Organizer only. */
export const POST = apiHandler(async (req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await parseParams(ctx.params, opParamsSchema);
  const input = await parseJson(req, closeOperationSchema);
  await closeOperation(user, id, input);
  return noContent();
});
