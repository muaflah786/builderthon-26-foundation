import { apiHandler, ok, parseJson } from "@/lib/api/server";
import { suggestSetup } from "@/lib/ops/scenarios/engine";
import { suggestSetupSchema } from "@/lib/ops/setup";
import { requireUser } from "@/server/auth/session";

/** POST /api/ops/suggest — turn a description into a setup to review. Writes nothing. */
export const POST = apiHandler(async (req) => {
  await requireUser();
  const input = await parseJson(req, suggestSetupSchema);
  return ok(suggestSetup(input));
});
