import "server-only";

import { headers } from "next/headers";
import { cache } from "react";
import { AppError } from "@/lib/errors";
import { auth } from "@/server/auth/auth";
import { ROLES, type Role, type SessionUser } from "@/types/auth";

/**
 * Auth contract (docs/MODULE_CONTRACTS.md §Auth). Use these in services, route
 * handlers and server components. `proxy.ts` is only a UX redirect; these are the
 * real checks.
 */

type BetterAuthUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
};

function toRole(value: unknown): Role {
  return ROLES.includes(value as Role) ? (value as Role) : "user";
}

/** Maps Better Auth's user to the public `SessionUser` shape (no extra fields). */
export function toSessionUser(user: BetterAuthUser): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: toRole(user.role),
    image: user.image ?? null,
  };
}

/** Current user, or null when signed out. Deduplicated per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const result = await auth.api.getSession({ headers: await headers() });
  return result?.user ? toSessionUser(result.user) : null;
});

/** Throws `AppError` UNAUTHENTICATED (401) when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw AppError.unauthenticated();
  return user;
}

/** 401 when signed out, 403 when the role does not match. Admin satisfies any role. */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== role) throw AppError.forbidden();
  return user;
}
