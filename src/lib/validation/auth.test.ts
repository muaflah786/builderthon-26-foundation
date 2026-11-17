import { describe, expect, it } from "vitest";
import { safeNextPath, signInSchema, signUpSchema } from "@/lib/validation/auth";

describe("safeNextPath", () => {
  it.each(["/app/x", "/app", "/app/items?page=2#top", "/"])("accepts relative path %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    "//evil.com",
    "//evil.com/app",
    "/\\evil.com",
    "https://evil.com",
    "http://evil.com/app",
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "app/x",
    "evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "",
  ])("rejects %j", (path) => {
    expect(safeNextPath(path)).toBe("/app");
  });

  it("falls back for missing values and uses the first array entry", () => {
    expect(safeNextPath(undefined)).toBe("/app");
    expect(safeNextPath(null)).toBe("/app");
    expect(safeNextPath(["/app/a", "/app/b"])).toBe("/app/a");
    expect(safeNextPath(["//evil.com"])).toBe("/app");
    expect(safeNextPath("//evil.com", "/")).toBe("/");
  });
});

describe("signUpSchema", () => {
  const valid = { name: "Ada", email: "ada@example.com", password: "correct-horse" };

  it("accepts valid input and trims the name", () => {
    expect(signUpSchema.parse({ ...valid, name: "  Ada  " })).toEqual(valid);
  });

  it("rejects a bad email", () => {
    expect(signUpSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(signUpSchema.safeParse({ ...valid, password: "1234567" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, password: "12345678" }).success).toBe(true);
  });

  it("requires a name of 1 to 100 characters", () => {
    expect(signUpSchema.safeParse({ ...valid, name: "   " }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, name: "a".repeat(101) }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, name: "a".repeat(100) }).success).toBe(true);
  });

  it("strips unknown keys such as role", () => {
    expect(signUpSchema.parse({ ...valid, role: "admin" })).not.toHaveProperty("role");
  });
});

describe("signInSchema", () => {
  it("requires email and password", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "", password: "x" }).success).toBe(false);
  });
});
