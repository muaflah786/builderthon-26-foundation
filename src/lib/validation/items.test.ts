import { describe, expect, it } from "vitest";
import { createItemSchema, listItemsQuerySchema, updateItemSchema } from "@/lib/validation/items";

describe("createItemSchema", () => {
  it("trims, defaults status and turns empty description into null", () => {
    expect(createItemSchema.parse({ title: "  Hi  ", description: "  " })).toEqual({
      title: "Hi",
      description: null,
      status: "open",
    });
  });
  it("rejects empty/too-long titles and bad status", () => {
    const r = createItemSchema.safeParse({ title: "", status: "nope" });
    expect(r.success).toBe(false);
    expect(createItemSchema.safeParse({ title: "x".repeat(201) }).success).toBe(false);
    expect(createItemSchema.safeParse({ title: "ok", description: "x".repeat(5001) }).success).toBe(
      false,
    );
  });
});

describe("updateItemSchema", () => {
  it("accepts a partial update", () => {
    expect(updateItemSchema.parse({ status: "done" })).toEqual({ status: "done" });
  });
  it("rejects an empty update", () => {
    expect(updateItemSchema.safeParse({}).success).toBe(false);
  });
});

describe("listItemsQuerySchema", () => {
  it("treats empty status as no filter", () => {
    expect(listItemsQuerySchema.parse({ status: "" }).status).toBeUndefined();
  });
  it("rejects sort fields outside the allow-list", () => {
    expect(listItemsQuerySchema.safeParse({ sort: "ownerId" }).success).toBe(false);
  });
});
