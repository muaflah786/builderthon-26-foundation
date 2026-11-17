# Security Checklist

Status: ✅ implemented and verified · 🟡 implemented, not yet verified · ⏳ pending (owner) · ➖ not applicable / optional

## Baseline (every change)

| Check                                                                                                                 | Status               | Where                    |
| --------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------ |
| All API input validated with Zod (`parseJson` / `parseQuery` / `parseParams`)                                         | ✅ helpers + tests   | `src/lib/api/server.ts`  |
| Unknown errors return a generic 500, details only in server logs                                                      | ✅ tested            | `toErrorResponse`        |
| JSON body size capped (1 MB) and content type enforced                                                                | ✅ tested            | `parseJson`              |
| Env vars validated at startup; auth secret required (≥32 chars) in production                                         | ✅                   | `src/lib/env.ts`         |
| Secrets only in `.env.local` / host env; `.env*` git-ignored except `.env.example`                                    | ✅                   | `.gitignore`             |
| Security headers: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`; `X-Powered-By` removed | ✅ verified via curl | `next.config.ts`         |
| Sort fields allow-listed; page size capped                                                                            | ✅ tested            | `listQuerySchema`        |
| SQL only through Drizzle's parameterized builder; no string-built SQL with user input                                 | ✅ convention        | `docs/DATABASE_GUIDE.md` |

## Auth & authorization (T1, T3)

| Check                                                                                    | Status                |
| ---------------------------------------------------------------------------------------- | --------------------- |
| Passwords hashed by Better Auth (scrypt); min length 8                                   | ⏳ T1                 |
| Session cookies `HttpOnly`, `SameSite=Lax`, `Secure` in production                       | ⏳ T1                 |
| Sign-in / sign-up rate-limited (Better Auth built-in)                                    | ⏳ T1                 |
| Better Auth `trustedOrigins` = `APP_URL` (CSRF/origin check)                             | ⏳ T1                 |
| `role` cannot be set from sign-up input                                                  | ⏳ T1 (test required) |
| `?next=` redirect accepts only relative paths (no open redirect)                         | ⏳ T1 (test required) |
| Every protected handler/service calls `requireUser`/`requireRole`; `proxy.ts` is UX only | ⏳ T1/T3              |
| Owner-scoped queries: other users' resources → 404                                       | ⏳ T3 (test required) |
| DTOs never include password hashes, tokens or other users' emails                        | ⏳ T1/T3              |

## Platform (T5)

| Check                                                                                       | Status                                                                                   |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Rate limit helper for expensive/public endpoints                                            | ⏳ T5                                                                                    |
| Uploads: size limit, MIME allow-list, random keys, no user-controlled paths, off by default | ⏳ T5                                                                                    |
| Outbound HTTP: timeout, response validated with Zod, API keys only server-side              | ⏳ T5                                                                                    |
| Content-Security-Policy with nonces                                                         | ➖ optional (Next inline scripts need nonce plumbing; enable via `proxy.ts` if required) |
| `npm audit --omit=dev` clean before final submission                                        | ⏳ coordinator                                                                           |

## Competition-day reminders

- Never commit `.env.local`, and never paste secrets into chats.
- Add a new route → wrap it in `apiHandler`, validate input, call `requireUser` unless it is deliberately public.
- Never render user HTML with `dangerouslySetInnerHTML`.
- Rotate `BETTER_AUTH_SECRET` if it ever leaks (this signs everyone out).
