import { apiHandler, ok, parseQuery } from "@/lib/api/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { resolveProvider } from "@/server/assistant/providers";
import { assertAssistantRateLimit } from "@/server/assistant/security";
import { getSite } from "@/server/assistant/sites";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  siteId: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(64),
});

/**
 * GET /api/assistant/status?siteId=… — is the assistant usable right now?
 * Runs a cheap provider health check (no inference, no cost). No secrets returned.
 */
export const GET = apiHandler(async (req) => {
  assertAssistantRateLimit(req);
  const { siteId } = await parseQuery(req, querySchema);
  const site = getSite(siteId);
  if (!site) throw AppError.notFound("Assistant site");

  const resolution = resolveProvider(site.preferredProvider);
  if (resolution.status !== "ready") {
    return ok({
      ready: false,
      configured: false,
      provider: null,
      model: null,
      detail: resolution.reason,
    });
  }
  const health = await resolution.provider.health(AbortSignal.timeout(5000));
  return ok({
    ready: health.ok,
    configured: true,
    provider: health.provider,
    model: health.model,
    detail: health.detail,
  });
});
