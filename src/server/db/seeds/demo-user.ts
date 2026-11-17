import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { account, user } from "@/server/db/schema/auth";

/**
 * Demo login for local development and live demos. Idempotent.
 * Creates the same rows Better Auth's email+password sign-up creates
 * (a `user` + a `credential` account holding the scrypt hash).
 */
export const DEMO_USER = {
  name: "Demo User",
  email: "demo@example.com",
  password: "demo-password-123",
} as const;

export async function ensureDemoUser(db: Db): Promise<string> {
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, DEMO_USER.email));
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  await db
    .insert(user)
    .values({ id, name: DEMO_USER.name, email: DEMO_USER.email, emailVerified: true });
  await db.insert(account).values({
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(DEMO_USER.password),
  });
  return id;
}

export async function seedDemoUser(db: Db): Promise<void> {
  await ensureDemoUser(db);
}
