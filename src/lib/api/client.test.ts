import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, apiFetch, apiFetchPage, buildUrl } from "@/lib/api/client";

const mockFetch = (status: number, body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(body, { status }));

afterEach(() => vi.restoreAllMocks());

describe("buildUrl", () => {
  it("skips empty values and repeats arrays", () => {
    expect(buildUrl("/api/x", { page: 2, q: "", tag: ["a", "b"], x: undefined })).toBe(
      "/api/x?page=2&tag=a&tag=b",
    );
  });
});

describe("apiFetch", () => {
  it("returns data and sends JSON", async () => {
    const spy = mockFetch(201, { ok: true, data: { id: "1" } });
    await expect(apiFetch("/api/x", { method: "POST", body: { a: 1 } })).resolves.toEqual({
      id: "1",
    });
    const init = spy.mock.calls[0][1]!;
    expect(init.body).toBe('{"a":1}');
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("throws ApiClientError with field errors", async () => {
    mockFetch(422, {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        fieldErrors: { title: ["Required"] },
      },
    });
    const error = await apiFetch("/api/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      code: "VALIDATION_ERROR",
      status: 422,
      fieldErrors: { title: ["Required"] },
    });
  });

  it("maps network failures to NETWORK_ERROR", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    await expect(apiFetch("/api/x")).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});

describe("apiFetchPage", () => {
  it("returns data with meta", async () => {
    const meta = { page: 1, pageSize: 20, total: 1, totalPages: 1 };
    mockFetch(200, { ok: true, data: [{ id: "1" }], meta });
    await expect(apiFetchPage("/api/x")).resolves.toEqual({ data: [{ id: "1" }], meta });
  });
});
