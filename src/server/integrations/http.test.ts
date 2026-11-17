import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fetchJson } from "@/server/integrations/http";

const schema = z.object({ temp: z.number() });
const url = "https://api.example.test/weather";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("fetchJson", () => {
  it("returns schema-validated data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ temp: 21, extra: "x" }));
    await expect(fetchJson(url, { schema })).resolves.toEqual({ temp: 21 });
  });

  it("retries a 503 then succeeds", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(Response.json({ temp: 5 }));
    await expect(fetchJson(url, { schema, backoffMs: 1 })).resolves.toEqual({ temp: 5 });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("gives up after retries with a generic error", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    await expect(fetchJson(url, { schema, retries: 2, backoffMs: 1 })).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      message: "Upstream service failed",
    });
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-idempotent POST", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 502 }));
    await expect(fetchJson(url, { schema, method: "POST", body: {} })).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("times out", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) =>
          init?.signal?.addEventListener("abort", () => reject(init.signal!.reason)),
        ),
    );
    await expect(fetchJson(url, { schema, timeoutMs: 20, retries: 0 })).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
    });
  });

  it("rejects a schema mismatch without leaking the upstream body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ temp: "hot", secret: "s3cr3t" }),
    );
    const error = await fetchJson(url, { schema }).catch((e: unknown) => e);
    expect(error).toMatchObject({ code: "INTERNAL_ERROR" });
    expect(JSON.stringify(error)).not.toContain("s3cr3t");
  });

  it("does not retry a 4xx", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 404 }));
    await expect(fetchJson(url, { schema })).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
