import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import { authSchema } from "@/server/db/schema/auth";

/**
 * Better Auth instance: email + password, database sessions, `role` on the user.
 * App code should use the helpers in `./session.ts`, not this object directly.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema: authSchema }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.APP_URL,
  trustedOrigins: [env.APP_URL],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  user: {
    additionalFields: {
      // input: false → sign-up / update-user bodies cannot set it.
      role: { type: "string", input: false, defaultValue: "user" },
    },
  },
  // Built-in limiter. Storage is in-memory, so limits are per server instance.
  rateLimit: {
    enabled: env.AUTH_RATE_LIMIT === "on",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
    },
  },
  // Better Auth skips its origin/CSRF check when NODE_ENV=test; keep it on everywhere
  // so tests exercise the same protection as production.
  advanced: { disableOriginCheck: false },
  // Must stay last: lets server actions / server code set auth cookies via next/headers.
  plugins: [nextCookies()],
});

export type Auth = typeof auth;
