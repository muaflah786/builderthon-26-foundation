# T4: Testing infrastructure & CI

## What exists

| Path                       | Purpose                                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| `tests/helpers/db.ts`      | `setupTestDb(extra?)`, `resetTestDb()`, `listTestTables()`: isolated in-memory DB built from schema  |
| `tests/helpers/auth.ts`    | `sessionModuleMock`, `mockSession(user \| null)`, `makeUser(overrides)`                              |
| `tests/helpers/request.ts` | `jsonRequest(method, path, body?)`, `callRoute(handler, req, params?)` → `{ status, headers, body }` |
| `tests/helpers/*.test.ts`  | Executable examples of every helper                                                                  |
| `playwright.config.ts`     | Chromium, prod build on port 3100, isolated `e2e.db`, rate limiting off, 1 worker                    |
| `tests/e2e/prepare-db.mjs` | Deletes `e2e.db` and applies committed migrations (refuses to touch anything but a file DB)          |
| `tests/e2e/smoke.spec.ts`  | Home, health, 404, no horizontal overflow at 360px                                                   |
| `.github/workflows/ci.yml` | `check` job (typecheck, lint, format, unit, build) + `e2e` job (Playwright, report on failure)       |
| `@tests/*` alias           | `tsconfig.json` + `vitest.config.mts`                                                                |

## Recipes

### Service test with a real (in-memory) database

```ts
import { beforeAll, beforeEach } from "vitest";
import { resetTestDb, setupTestDb } from "@tests/helpers/db";

beforeAll(() => setupTestDb());
beforeEach(() => resetTestDb());
```

Each test **file** gets its own empty DB (libSQL `file::memory:` = one DB per connection, one connection per worker module graph). Tables come from every file in `src/server/db/schema/`, so no committed migration is needed.

### Route-handler test as a signed-in user

```ts
vi.mock(
  "@/server/auth/session",
  async () => (await import("@tests/helpers/auth")).sessionModuleMock,
);
import { makeUser, mockSession } from "@tests/helpers/auth";
import { callRoute, jsonRequest } from "@tests/helpers/request";
import { POST } from "@/app/api/things/route";

mockSession(makeUser());
const res = await callRoute(POST, jsonRequest("POST", "/api/things", { title: "x" }));
expect(res.status).toBe(201);
```

The factory must use `await import(...)`, because `vi.mock` is hoisted above normal imports.

### E2E

```bash
npx playwright install chromium   # once
npm run test:e2e                  # builds + serves on :3100 with e2e.db
npx playwright test --ui          # interactive debugging
```

The E2E DB is built from **committed migrations** (`drizzle/`), so it also verifies the migration path. After a schema change, run `npm run db:generate` before running E2E.

## Known limitations

- E2E runs `next build`, which rewrites `.next/`. Stop `npm run dev` in the same folder first.
- The rate limiter is disabled in E2E (`AUTH_RATE_LIMIT=off`); its configuration is covered by T1's unit tests.
- CI YAML has not been run on GitHub (no remote configured): **UNTESTED** until the first push.
