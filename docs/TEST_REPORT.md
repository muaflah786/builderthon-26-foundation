# Test report

**Date:** 2026-11-17 · **Branch:** `main` · **Machine:** Windows 11, Node 24.18.0, npm 11.16.0, Chromium (Playwright 1.65.1)
Every result below was produced by actually running the command on this machine. Nothing is assumed.

## Summary

| Check                           | Command                                      | Result                                                                                       |
| ------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Clean install                   | `npm ci`                                     | ✅ 489 packages; 4 moderate advisories (dev-only, see below)                                 |
| Type check                      | `npm run typecheck`                          | ✅ no errors                                                                                 |
| Lint                            | `npm run lint`                               | ✅ 0 problems                                                                                |
| Formatting                      | `npm run format:check`                       | ✅ all files formatted                                                                       |
| Unit + integration              | `npm test`                                   | ✅ **25 files, 149 tests passed**                                                            |
| Production build                | `npm run build`                              | ✅ no warnings                                                                               |
| Browser E2E                     | `npm run test:e2e`                           | ✅ **14/14 passed** (production build, isolated `e2e.db` built from migrations)              |
| Production server smoke         | `npm start` + curl                           | ✅ health 200, security headers, sign-up → session → `/app` → sign-out, foreign Origin → 403 |
| Visual check                    | browser at 375px and 1280px                  | ✅ no horizontal overflow; filters stack on mobile; header collapses                         |
| Uploads over HTTP               | dev server, `STORAGE_DRIVER=local`, curl     | ✅ 401 signed out · 201 + served `image/png` · 422 `.exe` · 413 6 MB                         |
| Sample app (`sample/notes-app`) | generator + adaptation, `check` + `test:e2e` | ✅ 149 unit tests, 14/14 E2E                                                                 |

## Unit and integration tests by area (149)

| Area                | File (tests)                                                                                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API contracts       | `lib/api/server.test.ts` (12), `lib/api/client.test.ts` (5), `app/api/health/route.test.ts` (1)                                                                                                                                                                                      |
| Auth                | `lib/validation/auth.test.ts` (23, incl. open-redirect guard), `server/auth/session.test.ts` (10), `server/auth/auth.test.ts` (8, real Better Auth on in-memory DB: role cannot be self-assigned, origin check), `proxy.test.ts` (4)                                                 |
| UI                  | `button` (4), `dialog` (4), `pagination` (4), `toast` (3), `form-field` (3), `use-api-form` (5)                                                                                                                                                                                      |
| Reference resource  | `lib/validation/items.test.ts` (6), `server/services/items.test.ts` (8, incl. cross-user 404 and admin access), `app/api/items/route.test.ts` (8: 401/422/201/204/404), `server/db/query-helpers.test.ts` (6: LIKE escaping), `seeds/demo-user.test.ts` (1: seeded user can sign in) |
| Platform            | `integrations/http.test.ts` (7: retry, timeout, no leak), `security/rate-limit.test.ts` (5), `storage/s3.test.ts` (1: AWS SigV4 vector), `storage/storage.test.ts` (6), `app/api/uploads/route.test.ts` (6), `uploads/disabled.test.ts` (1)                                          |
| Test infrastructure | `tests/helpers/helpers.test.ts` (8)                                                                                                                                                                                                                                                  |

## Browser tests (14)

| Spec                | Scenarios                                                                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.spec.ts` (7)  | redirect to sign-in with `next`; sign-up lands on `/app` with role `user`; duplicate email error; wrong password error then `next` honoured; external `next` ignored; client validation; sign-out clears session |
| `items.spec.ts` (3) | create → list → search → edit → validation error → delete; other user's item shows not-found UI and API returns 404; search works with JavaScript disabled                                                       |
| `smoke.spec.ts` (4) | home page; health; unknown route 404; no overflow at 360px                                                                                                                                                       |

## Production (2026-11-17)

Deployed and verified at https://builderthon-26-foundation.vercel.app: GitHub Actions (check + 14/14 E2E on Linux), Turso connectivity, sign-up, protected routes, create/search/edit/delete, persistence, user isolation (404), sign-out, 0 runtime errors. Details: [DEPLOYMENT_REPORT.md](DEPLOYMENT_REPORT.md).

## Not verified (needs accounts or credentials)

| Item                                | Why                                                              |
| ----------------------------------- | ---------------------------------------------------------------- |
| S3/R2 uploads against a real bucket | no credentials (signing is verified against the AWS test vector) |

## Dependency audit

`npm audit`: 4 moderate advisories, all in `esbuild ≤ 0.24.2` pulled in by **drizzle-kit** (dev-only migration CLI; the advisory concerns esbuild's dev server, which drizzle-kit does not run). Nothing reaches the production bundle. `npm audit fix --force` would _downgrade_ drizzle-kit, so it was deliberately not applied. Re-check when drizzle-kit updates.
