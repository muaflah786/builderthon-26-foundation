import { apiHandler, ok, parseJson, parseParams } from "@/lib/api/server";
import { opChildParamsSchema, taskActionSchema } from "@/lib/validation/ops";
import { requireUser } from "@/server/auth/session";
import { actOnTask } from "@/server/services/ops";

type Ctx = RouteContext<"/api/ops/[id]/tasks/[childId]">;

/** POST /api/ops/:id/tasks/:taskId — { action: start | complete | release, note? } */
export const POST = apiHandler(async (req, ctx: Ctx) => {
  const user = await requireUser();
  const { id, childId } = await parseParams(ctx.params, opChildParamsSchema);
  const input = await parseJson(req, taskActionSchema);
  return ok(await actOnTask(user, id, childId, input));
});
