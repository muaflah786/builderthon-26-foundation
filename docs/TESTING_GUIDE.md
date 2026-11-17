# Testing Guide

## Commands

```bash
npm run check        # typecheck + lint + unit tests (run before every commit/PR)
npm test             # Vitest once
npm run test:watch   # Vitest watch mode
npm run test:e2e     # Playwright (added by T4; needs `npx playwright install chromium` once)
npm run build        # production build (run before every merge to main)
```

## What to test (minimum bar for accepting a task)

| Layer              | Tool                                                                | Required tests                                                  |
| ------------------ | ------------------------------------------------------------------- | --------------------------------------------------------------- |
| Validation schemas | Vitest                                                              | valid input passes; each rule rejects bad input                 |
| Services           | Vitest + in-memory DB                                               | happy path, not-found, **authorization** (other user → 404/403) |
| Route handlers     | Vitest (call `GET`/`POST` directly with a `Request`)                | status codes + envelope shape for success, 401, 422             |
| Components         | Vitest + Testing Library (`// @vitest-environment jsdom` on line 1) | renders, a11y basics (label ↔ input), key interactions          |
| Critical flows     | Playwright                                                          | sign-up → sign-in → create resource → list → sign-out           |

## Conventions

- Test files sit next to the code: `foo.ts` → `foo.test.ts`. E2E specs go in `tests/e2e/*.spec.ts`.
- Unit tests run in Node with `DATABASE_URL=file::memory:` (see `vitest.config.mts`). They never touch `local.db`.
- For DB-backed tests, use `tests/helpers/db.ts` (T4), which applies the schema to the in-memory DB and resets tables between tests.
- Route handlers that need a user: mock the session module (`vi.mock("@/server/auth/session", ...)`) using `tests/helpers/auth.ts` (T4).
- No real network in unit tests. Mock `fetch` with `vi.spyOn(globalThis, "fetch")`.

## Current coverage (Stage 1)

| Suite                              | Tests                                                                                       | Status     |
| ---------------------------------- | ------------------------------------------------------------------------------------------- | ---------- |
| `src/lib/api/server.test.ts`       | envelope helpers, `apiHandler` error mapping, `parseJson`, `parseQuery` + `listQuerySchema` | ✅ passing |
| `src/lib/api/client.test.ts`       | `buildUrl`, `apiFetch` success/error/network, `apiFetchPage`                                | ✅ passing |
| `src/app/api/health/route.test.ts` | health route against in-memory DB                                                           | ✅ passing |
