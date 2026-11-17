import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { idColumn } from "@/server/db/columns";
import {
  containsInsensitive,
  escapeLike,
  orderByFrom,
  pageWindow,
} from "@/server/db/query-helpers";
import { setupTestDb } from "@tests/helpers/db";

const words = sqliteTable("test_words", { id: idColumn(), word: text("word").notNull() });

beforeAll(async () => {
  await setupTestDb({ words });
  await db
    .insert(words)
    .values(
      ["100% done", "100 percent", "snake_case", "snakeXcase", "Back\\slash", "Apple"].map(
        (word) => ({ word }),
      ),
    );
});

const find = async (q: string) =>
  (await db.select().from(words).where(containsInsensitive(words.word, q)))
    .map((r) => r.word)
    .sort();

describe("escapeLike", () => {
  it("escapes %, _ and backslash", () => {
    expect(escapeLike("50%_a\\b")).toBe("50\\%\\_a\\\\b");
  });
});

describe("containsInsensitive", () => {
  it("matches case-insensitively", async () => {
    expect(await find("APPLE")).toEqual(["Apple"]);
  });
  it("treats % and _ literally", async () => {
    expect(await find("100%")).toEqual(["100% done"]);
    expect(await find("snake_")).toEqual(["snake_case"]);
  });
  it("treats backslash literally", async () => {
    expect(await find("k\\s")).toEqual(["Back\\slash"]);
  });
});

describe("orderByFrom + pageWindow", () => {
  it("sorts by an allow-listed column", async () => {
    const asc = await db
      .select()
      .from(words)
      .orderBy(orderByFrom({ word: words.word }, "word", "asc"));
    expect(asc[0].word).toBe("100 percent");
    const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(words);
    expect(n).toBe(6);
  });
  it("computes limit/offset", () => {
    expect(pageWindow(3, 20)).toEqual({ limit: 20, offset: 40 });
  });
});
