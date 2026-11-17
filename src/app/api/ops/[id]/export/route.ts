import { apiHandler, parseParams, parseQuery } from "@/lib/api/server";
import { exportQuerySchema, opParamsSchema } from "@/lib/validation/ops";
import { requireUser } from "@/server/auth/session";
import { exportCsv } from "@/server/services/ops-closure";

type Ctx = RouteContext<"/api/ops/[id]/export">;

/** GET /api/ops/:id/export?type=tasks|issues|activity — CSV download. Organizer only. */
export const GET = apiHandler(async (req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await parseParams(ctx.params, opParamsSchema);
  const { type } = await parseQuery(req, exportQuerySchema);
  const { filename, csv } = await exportCsv(user, id, type);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
