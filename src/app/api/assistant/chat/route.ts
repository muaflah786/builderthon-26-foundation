import { apiHandler, parseJson } from "@/lib/api/server";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { ASSISTANT_LIMITS } from "@/lib/assistant/limits";
import { chatRequestSchema } from "@/lib/assistant/schema";
import { assertAssistantRateLimit, assertOriginAllowed } from "@/server/assistant/security";
import { prepareChat } from "@/server/assistant/service";
import { getSite } from "@/server/assistant/sites";

/**
 * POST /api/assistant/chat — public, streaming (NDJSON, see ChatStreamEvent).
 * Pre-stream failures use the standard JSON error envelope.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = apiHandler(async (req) => {
  const length = Number(req.headers.get("content-length") ?? "0");
  if (length > ASSISTANT_LIMITS.maxBodyBytes) {
    throw new AppError("PAYLOAD_TOO_LARGE", "Request is too large");
  }
  assertOriginAllowed(req); // global policy first (before parsing anything)
  assertAssistantRateLimit(req);
  const input = await parseJson(req, chatRequestSchema);
  assertOriginAllowed(req, getSite(input.siteId)?.allowedOrigins);

  const signal = AbortSignal.any([req.signal, AbortSignal.timeout(env.AI_TIMEOUT_MS)]);
  const { events } = await prepareChat(input, signal);

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await events.next();
      if (done) return controller.close();
      controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
    },
    async cancel() {
      await events.return(undefined);
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
});
