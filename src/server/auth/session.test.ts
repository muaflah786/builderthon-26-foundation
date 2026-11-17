import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const getSession = vi.fn();

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/server/auth/auth", () => ({ auth: { api: { getSession } } }));

const { getSessionUser, requireRole, requireUser, toSessionUser } =
  await import("@/server/auth/session");

const baseUser = {
  id: "u1",
  name: "Ada",
  email: "ada@example.com",
  emailVerified: false,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function signedInAs(role: string) {
  getSession.mockResolvedValue({ session: { id: "s1" }, user: { ...baseUser, role } });
}

async function expectAppError(promise: Promise<unknown>, code: string, status: number) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ code, status });
}

beforeEach(() => {
  getSession.mockReset();
});

describe("signed out", () => {
  beforeEach(() => getSession.mockResolvedValue(null));

  it("getSessionUser returns null", async () => {
    await expect(getSessionUser()).resolves.toBeNull();
  });

  it("requireUser throws UNAUTHENTICATED (401)", async () => {
    await expectAppError(requireUser(), "UNAUTHENTICATED", 401);
  });

  it("requireRole throws UNAUTHENTICATED (401)", async () => {
    await expectAppError(requireRole("user"), "UNAUTHENTICATED", 401);
  });
});

describe("signed in as user", () => {
  beforeEach(() => signedInAs("user"));

  it("getSessionUser returns only SessionUser fields", async () => {
    await expect(getSessionUser()).resolves.toStrictEqual({
      id: "u1",
      name: "Ada",
      email: "ada@example.com",
      role: "user",
      image: null,
    });
  });

  it("requireRole('user') passes", async () => {
    await expect(requireRole("user")).resolves.toMatchObject({ id: "u1", role: "user" });
  });

  it("requireRole('admin') throws FORBIDDEN (403)", async () => {
    await expectAppError(requireRole("admin"), "FORBIDDEN", 403);
  });
});

describe("signed in as admin", () => {
  beforeEach(() => signedInAs("admin"));

  it("requireRole('admin') passes", async () => {
    await expect(requireRole("admin")).resolves.toMatchObject({ role: "admin" });
  });

  it("requireRole('user') passes (admin satisfies any role)", async () => {
    await expect(requireRole("user")).resolves.toMatchObject({ role: "admin" });
  });
});

describe("toSessionUser", () => {
  it("treats an unknown or missing role as 'user'", () => {
    expect(toSessionUser({ ...baseUser, role: "superuser" }).role).toBe("user");
    expect(toSessionUser({ ...baseUser }).role).toBe("user");
  });

  it("normalises a missing image to null", () => {
    expect(toSessionUser({ id: "u", name: "n", email: "e@x.co" }).image).toBeNull();
  });
});
