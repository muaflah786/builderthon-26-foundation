import { apiHandler, created, parseJson } from "@/lib/api/server";
import { setupDraftSchema } from "@/lib/ops/setup";
import { requireUser } from "@/server/auth/session";
import { launchOperation } from "@/server/services/ops";

/** POST /api/ops — launch a reviewed setup. Returns { id }. */
export const POST = apiHandler(async (req) => {
  const user = await requireUser();
  const draft = await parseJson(req, setupDraftSchema);
  return created({ id: await launchOperation(user, draft) });
});
