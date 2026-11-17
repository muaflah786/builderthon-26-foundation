import { AppError } from "@/lib/errors";

/**
 * Fixed-window, in-memory rate limiter.
 *
 *   assertRateLimit({ key: `upload:${user.id}`, limit: 20, windowMs: 60_000 });
 *   assertRateLimit({ key: `search:${clientIp(req)}`, limit: 60, windowMs: 60_000 });
 *
 * LIMITATION: state lives in this server process. On serverless/multiple instances,
 * each instance counts separately and counts reset on cold start. That is fine for a
 * demo. For strict limits, back it with Redis/Upstash (see docs/DEPLOYMENT.md).
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export type RateLimitResult = { success: boolean; remaining: number; resetAt: number };

export function rateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) sweep(now);
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return {
    success: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

/** Throws AppError RATE_LIMITED (429) when the limit is exceeded. */
export function assertRateLimit(options: Parameters<typeof rateLimit>[0]): RateLimitResult {
  const result = rateLimit(options);
  if (!result.success) {
    throw new AppError("RATE_LIMITED", "Too many requests. Please try again shortly.");
  }
  return result;
}

/** Best-effort client IP (behind Vercel/most proxies). Falls back to "unknown". */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function sweep(now: number) {
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  // Still full (all active)? Drop the oldest entries rather than grow without bound.
  if (buckets.size >= MAX_KEYS) {
    for (const key of Array.from(buckets.keys()).slice(0, MAX_KEYS / 10)) buckets.delete(key);
  }
}

/** Test helper. */
export function resetRateLimits() {
  buckets.clear();
}
