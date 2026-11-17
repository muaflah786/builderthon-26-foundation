import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { assertRateLimit, clientIp } from "@/server/security/rate-limit";

/** Normalizes "https://Example.com/" → "https://example.com" (origin only). */
export function toOrigin(value: string): string | null {
  try {
    return new URL(value.trim()).origin.toLowerCase();
  } catch {
    return null;
  }
}

export function allowedOrigins(siteOrigins: string[] = []): Set<string> {
  const list = [env.APP_URL, ...env.ASSISTANT_ALLOWED_ORIGINS.split(","), ...siteOrigins]
    .map((o) => (o.trim() ? toOrigin(o) : null))
    .filter((o): o is string => Boolean(o));
  return new Set(list);
}

/**
 * Origin policy for the public chat API:
 * - same-origin requests are always allowed (also covers Vercel preview URLs);
 * - cross-origin browser requests must come from an allow-listed origin;
 * - requests without an Origin header (curl, server-to-server) are allowed but
 *   still rate limited. Browsers always send Origin on cross-site POSTs.
 */
export function assertOriginAllowed(req: Request, siteOrigins?: string[]): void {
  const origin = req.headers.get("origin");
  if (!origin) {
    if (req.headers.get("sec-fetch-site") === "cross-site") {
      throw AppError.forbidden("Cross-site requests are not allowed");
    }
    return;
  }
  const normalized = toOrigin(origin);
  const self = toOrigin(req.url);
  if (normalized && (normalized === self || allowedOrigins(siteOrigins).has(normalized))) return;
  throw AppError.forbidden("This origin is not allowed to use the assistant");
}

/** Per-visitor and global per-minute limits (protects free provider quotas). */
export function assertAssistantRateLimit(req: Request): void {
  const perMinute = env.ASSISTANT_RATE_LIMIT_PER_MINUTE;
  assertRateLimit({ key: `assistant:ip:${clientIp(req)}`, limit: perMinute, windowMs: 60_000 });
  assertRateLimit({ key: "assistant:global", limit: perMinute * 10, windowMs: 60_000 });
}
