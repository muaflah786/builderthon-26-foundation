import { apiHandler, ok, parseJson, parseParams } from "@/lib/api/server";
import { opChildParamsSchema, updateMemberSchema } from "@/lib/validation/ops";
import { requireUser } from "@/server/auth/session";
import { updateMember } from "@/server/services/ops-people";

type Ctx = RouteContext<"/api/ops/[id]/members/[childId]">;

/** PATCH /api/ops/:id/members/:memberId — { teamId?, level? } */
export const PATCH = apiHandler(async (req, ctx: Ctx) => {
  const user = await requireUser();
  const { id, childId } = await parseParams(ctx.params, opChildParamsSchema);
  const input = await parseJson(req, updateMemberSchema);
  const row = await updateMember(user, id, childId, input);
  return ok({ id: row.id, level: row.level, teamId: row.teamId });
});
