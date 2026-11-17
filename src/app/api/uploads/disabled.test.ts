import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/uploads/route";
import { callRoute } from "@tests/helpers/request";

vi.mock(
  "@/server/auth/session",
  async () => (await import("@tests/helpers/auth")).sessionModuleMock,
);

describe("uploads disabled (STORAGE_DRIVER unset)", () => {
  it("POST /api/uploads returns 404", async () => {
    const res = await callRoute(
      POST,
      new Request("http://localhost/api/uploads", { method: "POST", body: new FormData() }),
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
