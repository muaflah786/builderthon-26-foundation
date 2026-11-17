/**
 * Auth contract shared by every module (see docs/MODULE_CONTRACTS.md §Auth).
 * The Auth module (T1) implements these in src/server/auth/session.ts:
 *
 *   getSessionUser(): Promise<SessionUser | null>   // never throws for "signed out"
 *   requireUser(): Promise<SessionUser>             // throws AppError UNAUTHENTICATED
 *   requireRole(role: Role): Promise<SessionUser>   // throws UNAUTHENTICATED / FORBIDDEN
 */

export const ROLES = ["user", "admin"] as const;
export type Role = (typeof ROLES)[number];

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  image: string | null;
};
