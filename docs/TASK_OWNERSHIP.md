# Task Ownership

> **Status 2026-11-17:** foundation tasks T1–T5 are complete and merged into `main` (see INTEGRATION_STATUS.md). For the competition, generate new tasks with [prompt 06](prompts/06-module-task-generation.md) and keep the rule "one owner per path".

Each path has exactly **one** owner. Edit only paths your task owns. If you need a change elsewhere, write it under "Requests to coordinator" in your completion report.

## Waves

| Wave | Task                                                 | Branch             | Depends on        | Prompt                                            |
| ---- | ---------------------------------------------------- | ------------------ | ----------------- | ------------------------------------------------- |
| 1    | Stage 1 core: setup + contracts                      | `main`             | —                 | done in master chat                               |
| 2    | **T1 Auth & authorization**                          | `task/t1-auth`     | Stage 1           | [docs/tasks/T1-auth.md](tasks/T1-auth.md)         |
| 2    | **T2 Design system, app shell, forms**               | `task/t2-ui`       | Stage 1           | [docs/tasks/T2-ui.md](tasks/T2-ui.md)             |
| 2    | **T4 Testing infrastructure & CI**                   | `task/t4-testing`  | Stage 1           | [docs/tasks/T4-testing.md](tasks/T4-testing.md)   |
| —    | Integration A (coordinator)                          | `main`             | T1, T2, T4 merged | master chat                                       |
| 3    | **T3 Reference resource (CRUD, search, pagination)** | `task/t3-items`    | Integration A     | [docs/tasks/T3-items.md](tasks/T3-items.md)       |
| 3    | **T5 Integrations, security extras, deployment**     | `task/t5-platform` | Integration A     | [docs/tasks/T5-platform.md](tasks/T5-platform.md) |
| —    | Integration B + final verification (coordinator)     | `main`             | T3, T5 merged     | master chat                                       |

Wave 2 has 3 tasks, one per team member. Wave 3 has 2 tasks; the third person does manual QA of Integration A and reviews the PRs.

## Path ownership

| Path                                                                                                                                                                                                                                                                                                       | Owner                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.prettierrc.json`, `drizzle.config.ts`, `.env.example`, `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `README.md`                                                                                                  | Coordinator                                  |
| `docs/*.md` (except the sections noted below)                                                                                                                                                                                                                                                              | Coordinator                                  |
| `drizzle/**` (generated migrations)                                                                                                                                                                                                                                                                        | Coordinator, at integration only             |
| `src/lib/api/**`, `src/lib/errors.ts`, `src/lib/env.ts`, `src/lib/utils.ts`, `src/lib/validation/common.ts`, `src/types/**`, `src/server/db/client.ts`, `src/server/db/index.ts`, `src/server/db/columns.ts`, `src/server/db/seed.ts`, `src/config/site.ts`, `src/app/layout.tsx`, `src/app/api/health/**` | Coordinator                                  |
| `src/server/auth/**`, `src/lib/auth-client.ts`, `src/app/api/auth/**`, `src/app/(auth)/**`, `src/proxy.ts`, `src/server/db/schema/auth.ts`, `src/lib/validation/auth.ts`, `tests/e2e/auth.spec.ts`                                                                                                         | **T1**                                       |
| `src/components/ui/**`, `src/components/forms/**`, `src/components/layout/**`, `src/app/globals.css`, `src/app/page.tsx`, `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/loading.tsx`, `src/app/dev/ui/**` (component gallery)                                         | **T2**                                       |
| `tests/helpers/**`, `tests/setup.ts`, `tests/stubs/**`, `vitest.config.mts`, `playwright.config.ts`, `tests/e2e/smoke.spec.ts`, `.github/workflows/**`, `tests/e2e/prepare-db.mjs`                                                                                                                         | **T4**                                       |
| `src/server/db/schema/items.ts`, `src/server/db/seeds/items.ts`, `src/server/db/query-helpers.ts`, `src/server/services/items.ts`, `src/lib/validation/items.ts`, `src/app/api/items/**`, `src/app/app/items/**`, `src/components/items/**`, `tests/e2e/items.spec.ts`                                     | **T3**                                       |
| `src/server/integrations/**`, `src/server/storage/**`, `src/server/security/**`, `src/app/api/uploads/**`, `src/server/logger.ts`, `docs/DEPLOYMENT.md`                                                                                                                                                    | **T5**                                       |
| `src/lib/assistant/**`, `src/server/assistant/**`, `src/components/assistant/**`, `src/assistant-sites/**`, `content/assistant/**`, `src/app/api/assistant/**`, `src/app/demo/**`, `scripts/assistant-smoke.mjs`, `tests/e2e/assistant.spec.ts`, `docs/T6_*.md`                                            | **T6**                                       |
| `src/app/app/layout.tsx`, `src/app/app/page.tsx` (protected area shell), `scripts/**`, `docs/prompts/**`                                                                                                                                                                                                   | Coordinator (wires T1 + T2 at Integration A) |

Tests (`*.test.ts`) live next to the file they test and belong to that file's owner.

## Doc sections tasks may edit

- `docs/API_GUIDE.md` → "Endpoint registry": only your own rows.
- `docs/INTEGRATION_STATUS.md` → never edit (the coordinator records your report).
- Each task writes its own notes in `docs/modules/<task>.md` (owned by that task).
