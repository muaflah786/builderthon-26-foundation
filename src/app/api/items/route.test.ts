import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET as GET_ONE, PATCH } from "@/app/api/items/[id]/route";
import { GET, POST } from "@/app/api/items/route";
import { db } from "@/server/db";
import { user } from "@/server/db/schema/auth";
import { makeUser, mockSession } from "@tests/helpers/auth";
import { resetTestDb, setupTestDb } from "@tests/helpers/db";
import { callRoute, jsonRequest } from "@tests/helpers/request";

vi.mock(
  "@/server/auth/session",
  async () => (await import("@tests/helpers/auth")).sessionModuleMock,
);

const alice = makeUser();
const bob = makeUser();

beforeAll(() => setupTestDb());
beforeEach(async () => {
  await resetTestDb();
  await db.insert(user).values([alice, bob].map(({ id, name, email }) => ({ id, name, email })));
  mockSession(alice);
});

const create = (body: unknown) => callRoute(POST, jsonRequest("POST", "/api/items", body));

describe("/api/items", () => {
  it("401 when signed out", async () => {
    mockSession(null);
    const res = await callRoute(GET, jsonRequest("GET", "/api/items"));
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });

  it("201 on create, then listed with meta", async () => {
    const res = await create({ title: "Hello" });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ title: "Hello", status: "open", ownerId: alice.id });

    const list = await callRoute(GET, jsonRequest("GET", "/api/items?pageSize=5"));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.meta).toEqual({ page: 1, pageSize: 5, total: 1, totalPages: 1 });
  });

  it("422 with fieldErrors on bad input", async () => {
    const res = await create({ title: "", status: "nope" });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.fieldErrors).sort()).toEqual(["status", "title"]);
  });

  it("422 on a sort field outside the allow-list", async () => {
    const res = await callRoute(GET, jsonRequest("GET", "/api/items?sort=ownerId"));
    expect(res.status).toBe(422);
  });

  it("ignores ownerId in the body", async () => {
    const res = await create({ title: "Mine", ownerId: bob.id });
    expect(res.body.data.ownerId).toBe(alice.id);
  });
});

describe("/api/items/[id]", () => {
  it("GET, PATCH and DELETE (204) for the owner", async () => {
    const { id } = (await create({ title: "T" })).body.data;

    expect((await callRoute(GET_ONE, jsonRequest("GET", `/api/items/${id}`), { id })).status).toBe(
      200,
    );

    const patched = await callRoute(
      PATCH,
      jsonRequest("PATCH", `/api/items/${id}`, { status: "done" }),
      { id },
    );
    expect(patched.status).toBe(200);
    expect(patched.body.data.status).toBe("done");

    const deleted = await callRoute(DELETE, jsonRequest("DELETE", `/api/items/${id}`), { id });
    expect(deleted.status).toBe(204);
    expect(deleted.body).toBeNull();
  });

  it("404 for another user's item", async () => {
    const { id } = (await create({ title: "Alice only" })).body.data;
    mockSession(bob);
    const res = await callRoute(GET_ONE, jsonRequest("GET", `/api/items/${id}`), { id });
    expect(res.status).toBe(404);
    const del = await callRoute(DELETE, jsonRequest("DELETE", `/api/items/${id}`), { id });
    expect(del.status).toBe(404);
  });

  it("422 on an empty PATCH", async () => {
    const { id } = (await create({ title: "T" })).body.data;
    const res = await callRoute(PATCH, jsonRequest("PATCH", `/api/items/${id}`, {}), { id });
    expect(res.status).toBe(422);
  });
});
