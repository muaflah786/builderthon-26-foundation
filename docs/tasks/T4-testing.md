# T4: Testing Infrastructure & CI (wave 2)

**Branch:** `task/t4-testing` · **Read first:** `docs/tasks/_COMMON.md` (all rules apply)

## Objective

Make it trivial for every other module to write DB-backed tests, authenticated route tests, and Playwright E2E tests. Add CI that runs the same checks on every push.

## You own

- `tests/helpers/**`, `tests/setup.ts`, `tests/stubs/**`, `vitest.config.mts`
- `playwright.config.ts`, `tests/e2e/smoke.spec.ts`
- `.github/workflows/ci.yml`
- `docs/modules/t4-testing.md`

## Must not modify

Application code under `src/**` (except adding `*.test.ts` files that test **Stage 1 core** files, e.g. `src/lib/validation/common.test.ts`), `package.json` (`test:e2e` = `playwright test` already exists; other script changes go under "Requests to coordinator"), `drizzle/`.

## Dependencies allowed

None (`@playwright/test`, `vitest`, Testing Library, `jsdom` are installed). Run `npx playwright install chromium` locally (this is not a package.json change).

## Requirements

1. **`tests/helpers/db.ts`**: `setupTestDb()` for use in a test file's `beforeAll`/`beforeEach`. It brings the in-memory DB (`DATABASE_URL=file::memory:`, already set in vitest config) up to the current schema **without needing committed migrations** (task branches don't commit `drizzle/`). Recommended: use `drizzle-kit/api`'s push for SQLite (`pushSQLiteSchema` or the current equivalent; check the installed `drizzle-kit` exports) with `import * as schema` from every file in `src/server/db/schema/` (a glob via `import.meta.glob` is fine in Vitest). Provide `resetTestDb()` that deletes all rows from every table (FK-safe order or `PRAGMA foreign_keys=OFF` during reset). Prove it works with a test that defines a throwaway table **inside the test file** (no schema file added to `src/`).
   - Note: `file::memory:` gives one DB per connection, and our client is a per-worker singleton, so this works per test file. Document this.
2. **`tests/helpers/auth.ts`**: `mockSession(user: SessionUser | null)` that stubs `@/server/auth/session` (`getSessionUser`, `requireUser`, `requireRole` with correct AppError semantics per contract) via `vi.mock`, plus `makeUser(overrides)` factory. It must work before T1 merges (mock the module path from the contract; use `vi.mock(path, factory)` with `{ virtual: true }` if needed, or document how).
3. **`tests/helpers/request.ts`**: `jsonRequest(method, url, body?)`, `callRoute(handler, req, params?)` returning `{ status, body }`, for testing route handlers, including `RouteContext` params as a Promise.
4. **Playwright** `playwright.config.ts`: `testDir: tests/e2e`, chromium only, `webServer` runs `npm run build && npm start` on port 3100 with `DATABASE_URL=file:./e2e.db` (fresh DB each run: delete it and apply the schema with `npx drizzle-kit push --force` **before** the server starts. Playwright starts `webServer` before `globalSetup`, so do this inside the `webServer.command`, e.g. a small `tests/e2e/prepare-db.mjs` script), `baseURL`, traces on first retry. (`*.db` is already git-ignored.)
5. **`tests/e2e/smoke.spec.ts`**: home page loads with app name; `/api/health` returns ok; unknown route shows 404 page.
6. **CI** `.github/workflows/ci.yml`: on push/PR: Node 22 + 24 matrix (or just 22), `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; a separate job installs chromium and runs Playwright, uploading the report on failure. Use `BETTER_AUTH_SECRET` from a dummy CI value (≥ 32 chars, not a real secret) in env.
7. Update `docs/TESTING_GUIDE.md`? **No.** Coordinator-owned. Put the content you want added in `docs/modules/t4-testing.md` and the coordinator will merge it.

## Acceptance criteria

- [ ] Example tests demonstrate each helper (`tests/helpers/*.test.ts`) and pass.
- [ ] `npx playwright test` passes locally (smoke spec).
- [ ] CI YAML validated (e.g. `npx --yes action-validator` if available, or careful review; mark it **UNTESTED** if not run on GitHub).
- [ ] `npm run check` and `npm run build` pass.
