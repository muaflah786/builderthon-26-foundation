import { apiHandler, ok, parseJson, parseParams } from "@/lib/api/server";
import { roleLabelsSchema } from "@/lib/ops/types";
import { opParamsSchema } from "@/lib/validation/ops";
import { requireUser } from "@/server/auth/session";
import { renameRoles } from "@/server/services/ops-people";

type Ctx = RouteContext<"/api/ops/[id]/role-labels">;

/** PATCH /api/ops/:id/role-labels — { organizer, coordinator, lead, member }. Organizer only. */
export const PATCH = apiHandler(async (req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await parseParams(ctx.params, opParamsSchema);
  const labels = await parseJson(req, roleLabelsSchema);
  return ok(await renameRoles(user, id, labels));
});
