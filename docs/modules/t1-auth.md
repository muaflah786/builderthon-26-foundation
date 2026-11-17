# T1: Authentication & Authorization

Email + password auth with database sessions and a `role` (`"user" | "admin"`) on the user, built on **Better Auth 1.7** and our Drizzle/libSQL database. Implements `docs/MODULE_CONTRACTS.md §Auth`.

## What exists

| File                                 | What it does                                                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `src/server/db/schema/auth.ts`       | `user`, `session`, `account`, `verification` tables (snake_case columns). `user.role` text enum, default `"user"`.    |
| `src/server/auth/auth.ts`            | `auth` (Better Auth instance): email+password (8–128 chars), `role` additional field with `input: false`, rate limit. |
| `src/server/auth/session.ts`         | **The contract:** `getSessionUser`, `requireUser`, `requireRole` (+ `toSessionUser` mapper).                          |
| `src/app/api/auth/[...all]/route.ts` | Better Auth HTTP endpoints under `/api/auth/*` (its own JSON format, not our envelope).                               |
| `src/lib/auth-client.ts`             | Browser client: `authClient`, `signIn`, `signUp`, `signOut`, `useSession`.                                            |
| `src/lib/validation/auth.ts`         | Zod: `signUpSchema`, `signInSchema`, `emailSchema`, `passwordSchema`, `nameSchema`; `safeNextPath()` redirect guard.  |
| `src/app/(auth)/sign-in`, `/sign-up` | Pages. Signed-in visitors are redirected to `/app`. After success they go to a sanitized `?next=` (default `/app`).   |
| `src/app/(auth)/_components/*`       | Client forms (`SignInForm`, `SignUpForm`), minimal `Field`/`FormAlert`/`SubmitButton`, and **`SignOutButton`**.       |
| `src/proxy.ts`                       | Optimistic redirect: `/app` and `/app/*` without a session cookie → `/sign-in?next=<path+query>`. No DB access.       |
| `tests/e2e/auth.spec.ts`             | Playwright flows (needs T4's `playwright.config.ts`).                                                                 |

Security properties (all verified, see the completion report): scrypt password hashing (Better Auth default), `HttpOnly; SameSite=Lax` session cookie (`Secure` automatically when `APP_URL` is https), 7-day sessions, origin/CSRF check against `trustedOrigins = [APP_URL]`, `role` ignored on sign-up input, and no open redirect via `?next=`.

## How to use it

### Protect a route handler

```ts
import { apiHandler, ok } from "@/lib/api/server";
import { requireUser, requireRole } from "@/server/auth/session";

export const GET = apiHandler(async () => {
  const user = await requireUser(); // 401 envelope when signed out
  return ok(await things.list(user));
});

export const DELETE = apiHandler(async () => {
  await requireRole("admin"); // 401 signed out, 403 for non-admins
  // ...
});
```

Put the check in the **service** when the service decides access (for example owner scoping): pass the `SessionUser` in, and let the service throw `AppError.notFound()` / `AppError.forbidden()`.

### Protect a page (server component)

```tsx
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";

export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/app/whatever");
  return <p>Hello {user.name}</p>;
}
```

Pages under `/app` already get the proxy redirect, but the proxy only checks that a cookie **exists**. Always call `getSessionUser()` / `requireUser()` for anything that matters. `getSessionUser` is wrapped in React `cache()`, so calling it in a layout and a page costs one lookup per request.

### Client components

```tsx
"use client";
import { useSession } from "@/lib/auth-client";
const { data, isPending } = useSession(); // data?.user.role
```

Use this for display only. Never use it for authorization.

### Sign out

Render `SignOutButton` from `src/app/(auth)/_components/sign-out-button.tsx` (it is meant for the app shell's `userMenu` slot), or call `signOut()` from `@/lib/auth-client`. Over raw HTTP it is `POST /api/auth/sign-out` with `Content-Type: application/json` and a body of `{}`.

### Make an admin

`role` cannot be set through sign-up or update-user. Change it directly in the database:

```bash
npm run db:studio      # open the `user` table and set role = admin
```

or with a one-off script/SQL: `UPDATE user SET role = 'admin' WHERE email = 'you@example.com';`. The user's **next** request picks it up, because sessions read the user row each time (no cookie cache).

### Useful endpoints

| Method | Path                      | Notes                                                  |
| ------ | ------------------------- | ------------------------------------------------------ |
| POST   | `/api/auth/sign-up/email` | `{ name, email, password }` → signs the user in too    |
| POST   | `/api/auth/sign-in/email` | `{ email, password }`; 401 `INVALID_EMAIL_OR_PASSWORD` |
| POST   | `/api/auth/sign-out`      | needs `Content-Type: application/json`                 |
| GET    | `/api/auth/get-session`   | `{ session, user }` or `null`                          |

Duplicate email returns 422 `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`. Too many attempts return 429.

## Rate limiting

Better Auth's built-in limiter, explicitly enabled in every environment: 100 requests/min per IP overall, `/sign-in/email` 10/min, `/sign-up/email` 5/min. **Storage is in-memory**: limits are per server instance and reset on restart. On serverless (Vercel) that means they are best-effort. For strict limits, set `rateLimit.storage: "database"` (needs a `rate_limit` table) or `"secondary-storage"`.

## Recipes (not implemented)

### OAuth / social login (for example GitHub)

1. Create an OAuth app. The callback URL is `${APP_URL}/api/auth/callback/github`.
2. Add `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` to `src/lib/env.ts` **and** `.env.example` (coordinator-owned).
3. In `auth.ts`: `socialProviders: { github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET } }`.
4. Client: `authClient.signIn.social({ provider: "github", callbackURL: safeNextPath(next) })`.
   The existing `account` table already stores provider accounts, so no schema change is needed. New OAuth users still get `role: "user"`.

### Email verification

1. Pick an email sender (Resend, SMTP, ...) behind a small `sendEmail()` in `src/server/integrations/`.
2. In `auth.ts`: `emailVerification: { sendOnSignUp: true, autoSignInAfterVerification: true, sendVerificationEmail: async ({ user, url }) => sendEmail(user.email, "Verify your email", url) }` and `emailAndPassword.requireEmailVerification: true`.
3. The `verification` table and `user.email_verified` column already exist. Sign-in then returns 403 `EMAIL_NOT_VERIFIED` until the user verifies, so show that message in `SignInForm`.

### Password reset

1. In `auth.ts`: `emailAndPassword.sendResetPassword: async ({ user, url }) => sendEmail(user.email, "Reset your password", url)`.
2. Add `/forgot-password` (calls `authClient.requestPasswordReset({ email, redirectTo: "/reset-password" })`) and `/reset-password` (reads `?token=`, calls `authClient.resetPassword({ newPassword, token })`).
3. Uses the existing `verification` table. Reuse `passwordSchema` for the new password.

## Known limitations

- Table names are **singular** (`user`, `session`, ...) to match Better Auth's model names. This is an intentional exception to the plural convention in `DATABASE_GUIDE.md`. Reference users as `user.id` from `@/server/db/schema/auth`.
- Better Auth generates its own ids (32-char random strings, not UUIDs). The column is still `text`.
- `signInSchema` does not enforce the 8-character minimum (only "required"), so a wrong short password gets the server's generic "Invalid email or password" rather than revealing the rule. Sign-up enforces 8–128.
- The contract text says "else `/`" for the post-auth fallback. T1's task prompt says `/app`, and that is what is implemented (`DEFAULT_AFTER_AUTH_PATH`).
- `advanced.disableOriginCheck: false` is set explicitly because Better Auth otherwise skips its origin/CSRF check when `NODE_ENV=test`. That would make the tests weaker than production.
- `auth.test.ts` builds the auth tables in the in-memory DB with `drizzle-kit/api`. Once T4's `tests/helpers/db.ts` exists, it can switch to that helper.
- With `strict: true` in `drizzle.config.ts`, `npm run db:push` asks for an interactive confirmation, so it must be run in a real terminal (not CI or a piped shell).
