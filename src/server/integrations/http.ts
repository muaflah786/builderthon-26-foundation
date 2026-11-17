import "server-only";

import { z } from "zod";
import { AppError } from "@/lib/errors";
import { logger } from "@/server/logger";

/**
 * Calls an external JSON API safely: timeout, limited retries with backoff,
 * response validated with Zod, upstream details logged but never returned.
 *
 *   const Weather = z.object({ temp: z.number() });
 *   const data = await fetchJson("https://api.example.com/weather?city=x", {
 *     schema: Weather,
 *     headers: { Authorization: `Bearer ${env.EXAMPLE_API_KEY}` },
 *   });
 */

export type FetchJsonOptions<S extends z.ZodType> = {
  schema: S;
  method?: "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** JSON-serialized. */
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Extra attempts after the first. Only used for idempotent methods. */
  retries?: number;
  /** Base backoff in ms (doubles each retry). */
  backoffMs?: number;
};

const IDEMPOTENT = new Set(["GET", "HEAD", "PUT", "DELETE"]);

class RetryableError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function upstreamFailure() {
  return new AppError("INTERNAL_ERROR", "Upstream service failed");
}

export async function fetchJson<S extends z.ZodType>(
  url: string,
  {
    schema,
    method = "GET",
    body,
    headers,
    timeoutMs = 10_000,
    retries = 2,
    backoffMs = 300,
  }: FetchJsonOptions<S>,
): Promise<z.infer<S>> {
  const maxAttempts = IDEMPOTENT.has(method) ? retries + 1 : 1;
  const host = new URL(url).host;

  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });

      if (res.status === 429 || res.status >= 500) {
        throw new RetryableError(`HTTP ${res.status}`);
      }
      if (!res.ok) {
        logger.error("upstream returned an error", { host, method, status: res.status });
        throw upstreamFailure();
      }

      let json: unknown;
      try {
        json = await res.json();
      } catch {
        logger.error("upstream returned invalid JSON", { host, method });
        throw upstreamFailure();
      }

      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        logger.error("upstream response did not match schema", {
          host,
          issues: z.flattenError(parsed.error),
        });
        throw upstreamFailure();
      }
      return parsed.data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      // Network error, timeout (TimeoutError/AbortError) or retryable status.
      if (attempt >= maxAttempts) {
        logger.error("upstream request failed", { host, method, attempt, error });
        throw upstreamFailure();
      }
      logger.warn("upstream request failed, retrying", { host, method, attempt });
      await sleep(backoffMs * 2 ** (attempt - 1));
    }
  }
}
