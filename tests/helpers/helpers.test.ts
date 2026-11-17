import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { apiHandler, created, ok, parseJson } from "@/lib/api/server";
import { db } from "@/server/db";
import { requireRole, requireUser } from "@/server/auth/session";
import { idColumn } from "@/server/db/columns";
import { z } from "zod";
import { makeUser, mockSession } from "@tests/helpers/auth";
import { listTestTables, resetTestDb, setupTestDb } from "@tests/helpers/db";
import { callRoute, jsonRequest } from "@tests/helpers/request";

vi.mock(
  "@/server/auth/session",
  async () => (await import("@tests/helpers/auth")).sessionModuleMock,
);

// A throwaway table that exists only in this test file.
const notes = sqliteTable("test_notes", { id: idColumn(), body: text("body").notNull() });

describe("tests/helpers/db", () => {
  beforeAll(() => setupTestDb({ notes }));
  beforeEach(() => resetTestDb());

  it("creates app schema tables and extra tables", async () => {
    const tables = await listTestTables();
    expect(tables).toEqual(expect.arrayContaining(["user", "session", "test_notes"]));
  });

  it("supports inserts and queries", async () => {
    await db.insert(notes).values({ body: "hello" });
    const rows = await db.select().from(notes);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("resetTestDb empties tables between tests", async () => {
    const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(notes);
    expect(n).toBe(0);
  });
});

describe("tests/helpers/auth", () => {
  it("signed out → requireUser throws UNAUTHENTICATED", async () => {
    mockSession(null);
    await expect(requireUser()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("user → requireRole('admin') throws FORBIDDEN; admin passes", async () => {
    mockSession(makeUser());
    await expect(requireRole("admin")).rejects.toMatchObject({ code: "FORBIDDEN" });
    const admin = makeUser({ role: "admin" });
    mockSession(admin);
    await expect(requireRole("user")).resolves.toEqual(admin);
  });
});

describe("tests/helpers/request", () => {
  const POST = apiHandler(async (req) => {
    const user = await requireUser();
    const input = await parseJson(req, z.object({ title: z.string().min(1) }));
    return created({ ...input, by: user.id });
  });
  const GET = apiHandler(async (_req, ctx: { params: Promise<{ id: string }> }) =>
    ok({ id: (await ctx.params).id }),
  );

  it("returns status and parsed body", async () => {
    const user = makeUser();
    mockSession(user);
    const res = await callRoute(POST, jsonRequest("POST", "/api/x", { title: "hi" }));
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true, data: { title: "hi", by: user.id } });
  });

  it("returns error envelopes", async () => {
    mockSession(null);
    const res = await callRoute(POST, jsonRequest("POST", "/api/x", { title: "" }));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("passes route params as a promise", async () => {
    const res = await callRoute(GET, jsonRequest("GET", "/api/x/abc"), { id: "abc" });
    expect(res.body.data).toEqual({ id: "abc" });
  });
});
