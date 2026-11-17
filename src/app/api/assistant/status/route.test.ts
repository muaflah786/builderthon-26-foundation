import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/assistant/status/route";
import { resetRateLimits } from "@/server/security/rate-limit";

beforeEach(() => resetRateLimits());

const status = (qs: string) =>
  GET(new Request(`http://localhost:3000/api/assistant/status${qs}`), {});

describe("GET /api/assistant/status", () => {
  it("reports not configured (test env has no AI_PROVIDER) without leaking secrets", async () => {
    const res = await status("?siteId=malabar-spice");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ ready: false, configured: false, provider: null });
    expect(body.data.detail).toContain("AI_PROVIDER");
  });

  it("404 for unknown sites, 422 for invalid ids", async () => {
    expect((await status("?siteId=nope")).status).toBe(404);
    expect((await status("?siteId=../x")).status).toBe(422);
  });
});
