import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "@/lib/env";

/**
 * Raw DB client. App code should import from "@/server/db" (which is server-only).
 * This file is importable by Node scripts (seed, tests) that run outside Next.js.
 *
 * Schema files are NOT passed to drizzle(): we use the SQL-like query builder
 * (db.select().from(table)...) which needs no registry. See docs/DATABASE_GUIDE.md.
 */

const globalForDb = globalThis as unknown as { __libsqlClient?: Client };

// Reuse one connection across hot reloads in development.
export const libsqlClient =
  globalForDb.__libsqlClient ??
  createClient({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN });

if (env.NODE_ENV !== "production") globalForDb.__libsqlClient = libsqlClient;

export const db = drizzle(libsqlClient);

export type Db = typeof db;
