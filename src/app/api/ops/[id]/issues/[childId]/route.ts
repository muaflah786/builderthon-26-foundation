import { apiHandler, ok, parseJson, parseParams } from "@/lib/api/server";
import { issueActionSchema, opChildParamsSchema } from "@/lib/validation/ops";
import { requireUser } from "@/server/auth/session";
import { actOnIssue } from "@/server/services/ops";

type Ctx = RouteContext<"/api/ops/[id]/issues/[childId]">;

/** POST /api/ops/:id/issues/:issueId — { action: acknowledge | resolve, note? } */
export const POST = apiHandler(async (req, ctx: Ctx) => {
  const user = await requireUser();
  const { id, childId } = await parseParams(ctx.params, opChildParamsSchema);
  const input = await parseJson(req, issueActionSchema);
  return ok(await actOnIssue(user, id, childId, input));
});
