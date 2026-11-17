import { env } from "@/lib/env";

/**
 * Minimal structured logger. Production: one JSON object per line (readable by
 * Vercel / any log drain). Development: readable `[level] message {context}`.
 *
 *   logger.info("item created", { itemId, userId });
 *   logger.error("upstream failed", { url, error });
 *
 * Never log secrets, passwords, tokens or full request bodies.
 */

type Level = "debug" | "info" | "warn" | "error";
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function serialize(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

function write(level: Level, message: string, context?: Record<string, unknown>) {
  if (order[level] < order[env.LOG_LEVEL]) return;
  const ctx = context
    ? Object.fromEntries(Object.entries(context).map(([k, v]) => [k, serialize(v)]))
    : undefined;
  const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.log;

  if (env.NODE_ENV === "production") {
    sink(JSON.stringify({ time: new Date().toISOString(), level, message, ...ctx }));
  } else {
    sink(`[${level}] ${message}`, ...(ctx ? [ctx] : []));
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => write("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => write("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => write("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => write("error", message, context),
};
