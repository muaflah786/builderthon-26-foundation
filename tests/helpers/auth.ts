import { AppError } from "@/lib/errors";
import type { Role, SessionUser } from "@/types/auth";

/**
 * Session mocking for route-handler and service tests.
 *
 * In the test file (vi.mock is hoisted, so import the mock inside the factory):
 *
 *   vi.mock("@/server/auth/session", async () => (await import("@tests/helpers/auth")).sessionModuleMock);
 *   import { mockSession, makeUser } from "@tests/helpers/auth";
 *
 *   mockSession(makeUser());          // signed in as a normal user
 *   mockSession(makeUser({ role: "admin" }));
 *   mockSession(null);                // signed out
 *
 * The mock follows the contract in docs/MODULE_CONTRACTS.md §Auth exactly.
 */

let currentUser: SessionUser | null = null;
let counter = 0;

export function mockSession(user: SessionUser | null): void {
  currentUser = user;
}

export function makeUser(overrides: Partial<SessionUser> = {}): SessionUser {
  counter += 1;
  return {
    id: `test-user-${counter}`,
    name: `Test User ${counter}`,
    email: `test-user-${counter}@example.com`,
    role: "user",
    image: null,
    ...overrides,
  };
}

async function getSessionUser(): Promise<SessionUser | null> {
  return currentUser;
}

async function requireUser(): Promise<SessionUser> {
  if (!currentUser) throw AppError.unauthenticated();
  return currentUser;
}

async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== role) throw AppError.forbidden();
  return user;
}

/** Drop-in replacement for the `@/server/auth/session` module. */
export const sessionModuleMock = {
  getSessionUser,
  requireUser,
  requireRole,
  toSessionUser: (user: SessionUser) => user,
};
