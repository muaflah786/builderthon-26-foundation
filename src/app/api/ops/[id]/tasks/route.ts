import { apiHandler, created, parseJson, parseParams } from "@/lib/api/server";
import { createTaskSchema, opParamsSchema } from "@/lib/validation/ops";
import { requireUser } from "@/server/auth/session";
import { createTask } from "@/server/services/ops-tasks";

type Ctx = RouteContext<"/api/ops/[id]/tasks">;

/** POST /api/ops/:id/tasks — create a task after launch. */
export const POST = apiHandler(async (req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await parseParams(ctx.params, opParamsSchema);
  const input = await parseJson(req, createTaskSchema);
  return created(await createTask(user, id, input));
});
