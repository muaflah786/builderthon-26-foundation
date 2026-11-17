import { z } from "zod";

/**
 * Server-side environment variables, validated once at startup.
 * Add new variables HERE (and in .env.example) — never read process.env directly elsewhere.
 * Browser-exposed variables must start with NEXT_PUBLIC_ and are read in src/config/site.ts.
 */

const isProductionRuntime =
  process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  /** libSQL URL: `file:./local.db` locally, `libsql://<db>.turso.io` in production. */
  DATABASE_URL: z.string().min(1).default("file:./local.db"),
  /** Only needed for remote libSQL/Turso databases. */
  DATABASE_AUTH_TOKEN: z.string().optional(),

  /** Secret used to sign auth sessions. Required in production (min 32 chars). */
  BETTER_AUTH_SECRET: isProductionRuntime
    ? z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters")
    : z.string().min(1).default("dev-only-insecure-secret-change-me-0000000000"),

  /** Public base URL of the deployed app (no trailing slash). */
  APP_URL: z.url().default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

function parseServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = z.flattenError(parsed.error).fieldErrors;
    console.error("❌ Invalid environment variables:", issues);
    throw new Error("Invalid environment variables. See .env.example.");
  }
  return parsed.data;
}

/** Import only from server code (route handlers, services, server components, scripts). */
export const env = parseServerEnv();
