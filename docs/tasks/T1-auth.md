# T1: Authentication & Authorization (wave 2)

**Branch:** `task/t1-auth` · **Read first:** `docs/tasks/_COMMON.md` (all rules apply)

## Objective

Implement email + password authentication with database sessions and role-based authorization using **Better Auth** (already installed) on our Drizzle/libSQL database. Implement the auth contract in `docs/MODULE_CONTRACTS.md §Auth` exactly.

## You own (create/edit only these)

- `src/server/auth/**` (`auth.ts` config, `session.ts` helpers, `*.test.ts`)
- `src/lib/auth-client.ts`
- `src/app/api/auth/[...all]/route.ts`
- `src/app/(auth)/**` (`sign-in/page.tsx`, `sign-up/page.tsx`, their client form components, optional `layout.tsx`)
- `src/proxy.ts`
- `src/server/db/schema/auth.ts`
- `src/lib/validation/auth.ts`
- `tests/e2e/auth.spec.ts` (write it; T4 provides the Playwright config. If T4 is not merged yet, make sure the spec is valid but do not block on running it.)
- `docs/modules/t1-auth.md`

## Must not modify

Everything else, especially `src/lib/api/**`, `src/lib/env.ts`, `src/types/auth.ts`, `src/components/**`, `package.json`, `drizzle/`.

## Dependencies allowed

None (`better-auth` is installed). Read its docs at https://www.better-auth.com/docs (Next.js integration, Drizzle adapter, email & password, rate limit, `additionalFields`).

## Requirements

1. **Schema** (`schema/auth.ts`): Better Auth's `user`, `session`, `account`, `verification` tables for SQLite, following `docs/DATABASE_GUIDE.md` naming (snake_case columns). `user.role` text enum `["user","admin"]`, default `"user"`. Verify the field names against Better Auth's expected schema (for example, run `npx @better-auth/cli generate --output <scratch file>` to compare, but hand-write the final file). Map tables in the adapter config if names differ.
2. **Config** (`server/auth/auth.ts`, `import "server-only"`):
   - `betterAuth({ database: drizzleAdapter(db, { provider: "sqlite", schema }), secret: env.BETTER_AUTH_SECRET, baseURL: env.APP_URL, trustedOrigins: [env.APP_URL], emailAndPassword: { enabled: true, minPasswordLength: 8 }, user: { additionalFields: { role: { type: "string", input: false, defaultValue: "user" } } }, plugins: [nextCookies()] })`
   - Rate limiting enabled (Better Auth built-in) for sign-in/sign-up. Note: its default storage is in-memory.
   - Use the **raw** client from `@/server/db/client` only if `@/server/db` causes issues; prefer `@/server/db`.
3. **Session helpers** (`server/auth/session.ts`): `getSessionUser`, `requireUser`, `requireRole` exactly per the contract. Map Better Auth's user → `SessionUser` (never return extra fields). `requireRole("user")` is satisfied by admin too. Wrap `getSessionUser` in React `cache()` so it is deduplicated per request.
4. **Route** `api/auth/[...all]/route.ts`: `toNextJsHandler(auth)`.
5. **Client** `lib/auth-client.ts`: `createAuthClient()` from `better-auth/react`; export `authClient`, `signIn`, `signUp`, `signOut`, `useSession`.
6. **Pages** `/sign-in`, `/sign-up`: accessible forms (labels, error messages, disabled+pending state), validated client-side with `src/lib/validation/auth.ts` (shared Zod schemas: email, password ≥ 8, name 1 to 100). Show server errors (wrong password, email taken). After success, redirect to `?next=` **only if it starts with `/` and not `//`**. Otherwise go to `/app`. Signed-in users visiting these pages are redirected to `/app`. Style with Tailwind semantic tokens (`bg-primary`, `border-border`, ...) and native elements. The coordinator swaps in T2's components at integration, so keep form markup simple. Use `cn` from `@/lib/utils`.
7. **Proxy** (`src/proxy.ts`, Next 16 convention; read `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`): for `/app/:path*`, if there is no Better Auth session cookie, redirect to `/sign-in?next=<path>`. Cookie check only (`getSessionCookie` from `better-auth/cookies`). No DB access.
8. **Docs**: `docs/modules/t1-auth.md` covers how to protect a page/handler, how to make an admin, and recipes (not implemented) for OAuth providers, email verification and password reset.

## Acceptance criteria

- [ ] `npm run db:push` creates the 4 auth tables in `local.db`.
- [ ] Manual (dev server): sign up → lands on `/app` (a 404 is acceptable; the coordinator creates `/app` at integration) → session cookie present → `GET /api/auth/get-session` returns the user with `role: "user"`.
- [ ] Sign out works. Sign in with a wrong password shows an error. Duplicate email sign-up shows an error.
- [ ] Sign-up request with `"role":"admin"` in the JSON body still creates `role: "user"` (Vitest test against `auth.api.signUpEmail` with in-memory DB, or a documented manual curl check).
- [ ] Unit tests for `session.ts` (mock `auth.api.getSession`): signed out → `getSessionUser` null, `requireUser` throws UNAUTHENTICATED; user calling `requireRole("admin")` → FORBIDDEN; admin passes.
- [ ] Unit test for the `next` redirect sanitizer (`/app/x` ok; `//evil.com`, `https://evil.com`, `javascript:` rejected).
- [ ] Unauthenticated visit to `/app/anything` redirects to `/sign-in?next=%2Fapp%2Fanything`.
- [ ] `npm run check` and `npm run build` pass.

## Report

Use the completion report format in `_COMMON.md`. Also update the `/api/auth/*` row in `docs/API_GUIDE.md` "Endpoint registry".
