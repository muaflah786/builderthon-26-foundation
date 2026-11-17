import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { listItemsQuerySchema } from "@/lib/validation/items";
import { db } from "@/server/db";
import { user } from "@/server/db/schema/auth";
import { createItem, deleteItem, getItem, listItems, updateItem } from "@/server/services/items";
import { makeUser } from "@tests/helpers/auth";
import { resetTestDb, setupTestDb } from "@tests/helpers/db";

const alice = makeUser({ name: "Alice" });
const bob = makeUser({ name: "Bob" });
const admin = makeUser({ name: "Admin", role: "admin" });
const q = (input: Record<string, unknown> = {}) => listItemsQuerySchema.parse(input);

beforeAll(() => setupTestDb());
beforeEach(async () => {
  await resetTestDb();
  await db
    .insert(user)
    .values([alice, bob, admin].map(({ id, name, email, role }) => ({ id, name, email, role })));
});

describe("items service: CRUD", () => {
  it("creates, reads, updates and deletes", async () => {
    const item = await createItem(alice, { title: "First", description: null, status: "open" });
    expect(item).toMatchObject({ ownerId: alice.id, title: "First", status: "open" });
    expect(item.createdAt).toMatch(/T/);

    expect(await getItem(alice, item.id)).toEqual(item);

    const updated = await updateItem(alice, item.id, { status: "done", description: "notes" });
    expect(updated).toMatchObject({ title: "First", status: "done", description: "notes" });

    const cleared = await updateItem(alice, item.id, { description: null });
    expect(cleared.description).toBeNull();

    await deleteItem(alice, item.id);
    await expect(getItem(alice, item.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("items service: authorization", () => {
  it("other users get 404 for read, update and delete", async () => {
    const item = await createItem(alice, { title: "Private", status: "open" });
    await expect(getItem(bob, item.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(updateItem(bob, item.id, { title: "x" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(deleteItem(bob, item.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await getItem(alice, item.id)).title).toBe("Private");
  });

  it("lists only the caller's items; admin sees all", async () => {
    await createItem(alice, { title: "A", status: "open" });
    await createItem(bob, { title: "B", status: "open" });
    expect((await listItems(alice, q())).rows.map((r) => r.title)).toEqual(["A"]);
    expect((await listItems(admin, q())).meta.total).toBe(2);
  });

  it("admin can update and delete anyone's item", async () => {
    const item = await createItem(alice, { title: "A", status: "open" });
    expect((await updateItem(admin, item.id, { status: "done" })).status).toBe("done");
    await deleteItem(admin, item.id);
  });
});

describe("items service: list query", () => {
  beforeEach(async () => {
    for (const [title, status, description] of [
      ["Buy milk", "open", null],
      ["Write report", "in_progress", "Quarterly 100% numbers"],
      ["Fix_bug", "done", null],
      ["Fixbug later", "open", null],
    ] as const) {
      await createItem(alice, { title, status, description });
    }
  });

  it("searches title and description, escaping wildcards", async () => {
    expect((await listItems(alice, q({ q: "milk" }))).rows.map((r) => r.title)).toEqual([
      "Buy milk",
    ]);
    expect((await listItems(alice, q({ q: "100%" }))).rows.map((r) => r.title)).toEqual([
      "Write report",
    ]);
    expect((await listItems(alice, q({ q: "fix_" }))).rows.map((r) => r.title)).toEqual([
      "Fix_bug",
    ]);
  });

  it("filters by status", async () => {
    const { rows } = await listItems(alice, q({ status: "open" }));
    expect(rows.map((r) => r.title).sort()).toEqual(["Buy milk", "Fixbug later"]);
  });

  it("sorts by title", async () => {
    const { rows } = await listItems(alice, q({ sort: "title", order: "asc" }));
    expect(rows.map((r) => r.title)).toEqual([
      "Buy milk",
      "Fix_bug",
      "Fixbug later",
      "Write report",
    ]);
  });

  it("paginates with correct meta", async () => {
    const page2 = await listItems(alice, q({ page: 2, pageSize: 3, sort: "title", order: "asc" }));
    expect(page2.rows.map((r) => r.title)).toEqual(["Write report"]);
    expect(page2.meta).toEqual({ page: 2, pageSize: 3, total: 4, totalPages: 2 });
  });
});
