import { apiHandler, noContent, parseJson, parseParams } from "@/lib/api/server";
import { joinLinkActionSchema, opParamsSchema } from "@/lib/validation/ops";
import { requireUser } from "@/server/auth/session";
import { changeJoinLink } from "@/server/services/ops";

type Ctx = RouteContext<"/api/ops/[id]/join-link">;

/** POST /api/ops/:id/join-link — { action: rotate | enable | disable } */
export const POST = apiHandler(async (req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await parseParams(ctx.params, opParamsSchema);
  const { action } = await parseJson(req, joinLinkActionSchema);
  await changeJoinLink(user, id, action);
  return noContent();
});
