import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { idColumn, timestamps } from "@/server/db/columns";
import { ROLES } from "@/types/auth";

/**
 * Better Auth tables (user, session, account, verification) for SQLite.
 *
 * Table names stay singular because Better Auth's Drizzle adapter looks models up
 * by these keys (`user`, `session`, ...). Columns follow docs/DATABASE_GUIDE.md
 * (snake_case in SQL, camelCase in TS). Field names match Better Auth 1.7's
 * expected schema (`getAuthTables` from "better-auth/db").
 *
 * Better Auth generates ids and timestamps itself; the helper defaults only apply
 * to rows inserted by other code (seeds, scripts).
 */

export const user = sqliteTable("user", {
  id: idColumn(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  /** Not settable from sign-up input (`input: false` in the auth config). */
  role: text("role", { enum: ROLES }).notNull().default("user"),
  ...timestamps(),
});

export const session = sqliteTable(
  "session",
  {
    id: idColumn(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps(),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: idColumn(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    /** Password hash (scrypt) for the email+password provider. Never expose. */
    password: text("password"),
    ...timestamps(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: idColumn(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/** Passed to Better Auth's Drizzle adapter. */
export const authSchema = { user, session, account, verification };

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
