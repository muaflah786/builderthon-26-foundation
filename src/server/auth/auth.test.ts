import { generateSQLiteDrizzleJson, generateSQLiteMigration } from "drizzle-kit/api";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { env } from "@/lib/env";
import { auth } from "@/server/auth/auth";
import { db, libsqlClient } from "@/server/db/client";
import * as authTables from "@/server/db/schema/auth";

/**
 * Integration tests against Better Auth with the in-memory DB
 * (DATABASE_URL=file::memory: in vitest.config.mts). The auth tables are created
 * from the Drizzle schema, so the test also proves the schema matches Better Auth.
 */

const origin = env.APP_URL;
const password = "correct-horse-battery";

beforeAll(async () => {
  const empty = await generateSQLiteDrizzleJson({});
  const current = await generateSQLiteDrizzleJson(authTables);
  for (const statement of await generateSQLiteMigration(empty, current)) {
    await libsqlClient.execute(statement);
  }
});

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return auth.handler(
    new Request(`${origin}/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin, ...headers },
      body: JSON.stringify(body),
    }),
  );
}

async function roleOf(email: string) {
  const [row] = await db
    .select({ role: authTables.user.role })
    .from(authTables.user)
    .where(eq(authTables.user.email, email));
  return row?.role;
}

describe("sign-up", () => {
  it("ignores role in the HTTP JSON body: new users are always 'user'", async () => {
    const email = "http-admin@example.com";
    const res = await post("/sign-up/email", { name: "Mallory", email, password, role: "admin" });
    // `input: false` → Better Auth drops the field and applies the default.
    expect(res.status).toBe(200);
    expect((await res.json()).user.role).toBe("user");
    expect(await roleOf(email)).toBe("user");
  });

  it("auth.api.signUpEmail with role: 'admin' still creates role 'user'", async () => {
    const email = "api-admin@example.com";
    const result = await auth.api.signUpEmail({
      // Cast: the typed body (correctly) has no `role` key.
      body: { name: "Mallory", email, password, role: "admin" } as never,
    });
    expect(result.user.role).toBe("user");
    expect(await roleOf(email)).toBe("user");
  });

  it("creates a user with role 'user', a session cookie and a hashed password", async () => {
    const email = "ada@example.com";
    const res = await post("/sign-up/email", { name: "Ada", email, password });
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/better-auth\.session_token=.+HttpOnly/i);
    expect(res.headers.get("set-cookie")).toMatch(/SameSite=Lax/i);

    const body = await res.json();
    expect(body.user).toMatchObject({ email, role: "user" });
    expect(JSON.stringify(body)).not.toContain(password);

    const [acct] = await db
      .select({ password: authTables.account.password })
      .from(authTables.account)
      .where(eq(authTables.account.userId, body.user.id));
    expect(acct?.password).toBeTruthy();
    expect(acct?.password).not.toBe(password);
  });

  it("rejects a duplicate email", async () => {
    const res = await post("/sign-up/email", { name: "Ada 2", email: "ada@example.com", password });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("rejects a password shorter than 8 characters", async () => {
    const res = await post("/sign-up/email", {
      name: "Short",
      email: "short@example.com",
      password: "1234567",
    });
    expect(res.status).toBe(400);
  });

  it("rejects requests from an untrusted origin", async () => {
    const res = await post(
      "/sign-up/email",
      { name: "X", email: "x@example.com", password },
      { origin: "https://evil.example" },
    );
    expect(res.status).toBe(403);
  });
});

describe("sign-in and session", () => {
  it("rejects a wrong password with 401", async () => {
    const res = await post("/sign-in/email", { email: "ada@example.com", password: "wrong-pass" });
    expect(res.status).toBe(401);
  });

  it("signs in, returns the session with role 'user', then signs out", async () => {
    const res = await post("/sign-in/email", { email: "ada@example.com", password });
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie")!.split(";")[0]!;

    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(session?.user).toMatchObject({ email: "ada@example.com", role: "user" });

    const out = await auth.handler(
      new Request(`${origin}/api/auth/sign-out`, {
        method: "POST",
        headers: { cookie, origin },
      }),
    );
    expect(out.status).toBe(200);
    await expect(auth.api.getSession({ headers: new Headers({ cookie }) })).resolves.toBeNull();
  });
});
