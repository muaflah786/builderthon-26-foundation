import { beforeAll, describe, expect, it } from "vitest";
import { env } from "@/lib/env";
import { auth } from "@/server/auth/auth";
import { db } from "@/server/db";
import { DEMO_USER, ensureDemoUser } from "@/server/db/seeds/demo-user";
import { setupTestDb } from "@tests/helpers/db";

beforeAll(() => setupTestDb());

describe("seeded demo user", () => {
  it("is idempotent and can sign in through Better Auth", async () => {
    const id = await ensureDemoUser(db);
    expect(await ensureDemoUser(db)).toBe(id);

    const res = await auth.handler(
      new Request(`${env.APP_URL}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: env.APP_URL },
        body: JSON.stringify({ email: DEMO_USER.email, password: DEMO_USER.password }),
      }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).user).toMatchObject({ id, email: DEMO_USER.email, role: "user" });
  });
});
