import { apiHandler, ok, parseJson } from "@/lib/api/server";
import { AppError } from "@/lib/errors";
import { joinOperationSchema } from "@/lib/validation/ops";
import { requireUser } from "@/server/auth/session";
import { rateLimit } from "@/server/security/rate-limit";
import { joinOperation } from "@/server/services/ops";

/** POST /api/ops/join — join with an invite token (as the lowest permission level). */
export const POST = apiHandler(async (req) => {
  const user = await requireUser();
  const limited = rateLimit({ key: `ops-join:${user.id}`, limit: 20, windowMs: 60_000 });
  if (!limited.success)
    throw new AppError("RATE_LIMITED", "Too many attempts. Wait a minute and try again.");
  const input = await parseJson(req, joinOperationSchema);
  return ok(await joinOperation(user, input));
});
