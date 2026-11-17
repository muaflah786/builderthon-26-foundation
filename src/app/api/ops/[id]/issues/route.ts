import { apiHandler, created, parseJson, parseParams } from "@/lib/api/server";
import { opParamsSchema, reportIssueSchema } from "@/lib/validation/ops";
import { requireUser } from "@/server/auth/session";
import { reportIssue } from "@/server/services/ops";

type Ctx = RouteContext<"/api/ops/[id]/issues">;

/** POST /api/ops/:id/issues — report a problem. */
export const POST = apiHandler(async (req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await parseParams(ctx.params, opParamsSchema);
  const input = await parseJson(req, reportIssueSchema);
  return created(await reportIssue(user, id, input));
});
