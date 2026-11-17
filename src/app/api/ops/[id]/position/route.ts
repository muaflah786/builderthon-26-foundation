import { z } from "zod";
import { apiHandler, noContent, ok, parseJson, parseParams } from "@/lib/api/server";
import { opParamsSchema } from "@/lib/validation/ops";
import { requireUser } from "@/server/auth/session";
import { listPositions, sharePosition, stopSharing } from "@/server/services/ops-positions";

type Ctx = RouteContext<"/api/ops/[id]/position">;

const positionSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100_000).nullable().optional(),
});

/** GET: positions visible to me. POST: share my position. DELETE: stop sharing. */
export const GET = apiHandler(async (_req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await parseParams(ctx.params, opParamsSchema);
  return ok(await listPositions(user, id));
});

export const POST = apiHandler(async (req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await parseParams(ctx.params, opParamsSchema);
  await sharePosition(user, id, await parseJson(req, positionSchema));
  return noContent();
});

export const DELETE = apiHandler(async (_req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await parseParams(ctx.params, opParamsSchema);
  await stopSharing(user, id);
  return noContent();
});
