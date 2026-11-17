import { describe, expect, it } from "vitest";
import { z } from "zod";
import { apiHandler, created, ok, paginated, parseJson, parseQuery } from "@/lib/api/server";
import { AppError } from "@/lib/errors";
import { listQuerySchema, pageMeta } from "@/lib/validation/common";

const jsonRequest = (body: string, contentType = "application/json") =>
  new Request("http://test.local/api/x", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });

describe("success helpers", () => {
  it("wraps data in the ok envelope", async () => {
    const res = ok({ a: 1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { a: 1 } });
  });

  it("created returns 201", () => {
    expect(created({}).status).toBe(201);
  });

  it("paginated includes meta", async () => {
    const res = paginated([1, 2], pageMeta(42, 2, 20));
    expect(await res.json()).toEqual({
      ok: true,
      data: [1, 2],
      meta: { page: 2, pageSize: 20, total: 42, totalPages: 3 },
    });
  });
});

describe("apiHandler", () => {
  it("converts AppError into the error envelope", async () => {
    const handler = apiHandler(async () => {
      throw AppError.notFound("Thing");
    });
    const res = await handler(new Request("http://test.local"), {});
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Thing not found" },
    });
  });

  it("hides unknown error details behind INTERNAL_ERROR", async () => {
    const original = console.error;
    console.error = () => {};
    const handler = apiHandler(async () => {
      throw new Error("secret stack detail");
    });
    const res = await handler(new Request("http://test.local"), {});
    console.error = original;
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain("secret");
  });
});

describe("parseJson", () => {
  const schema = z.object({ title: z.string().min(1) });

  it("returns validated data", async () => {
    await expect(parseJson(jsonRequest('{"title":"hi"}'), schema)).resolves.toEqual({
      title: "hi",
    });
  });

  it("rejects malformed JSON with BAD_REQUEST", async () => {
    await expect(parseJson(jsonRequest("{oops"), schema)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("rejects a non-JSON content type", async () => {
    await expect(parseJson(jsonRequest("title=x", "text/plain"), schema)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("returns field errors on validation failure", async () => {
    await expect(parseJson(jsonRequest('{"title":""}'), schema)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 422,
      fieldErrors: { title: expect.any(Array) },
    });
  });
});

describe("parseQuery + listQuerySchema", () => {
  const schema = listQuerySchema(["createdAt", "title"]);

  it("applies defaults", async () => {
    const q = await parseQuery(new Request("http://test.local/api/x"), schema);
    expect(q).toEqual({ page: 1, pageSize: 20, q: undefined, sort: "createdAt", order: "desc" });
  });

  it("coerces and validates values", async () => {
    const q = await parseQuery(
      new Request("http://test.local/api/x?page=3&pageSize=5&q=%20hello%20&sort=title&order=asc"),
      schema,
    );
    expect(q).toEqual({ page: 3, pageSize: 5, q: "hello", sort: "title", order: "asc" });
  });

  it("rejects unknown sort fields and oversized pages", async () => {
    await expect(
      parseQuery(new Request("http://test.local/api/x?sort=password&pageSize=1000"), schema),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
