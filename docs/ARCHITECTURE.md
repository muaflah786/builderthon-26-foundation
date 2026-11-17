# Architecture

> Owner: Coordinator (master conversation). Change only through the coordinator.

## Goals

1. Go from an unknown problem statement to a working prototype in hours, not days.
2. Zero external services needed to run locally (no Docker, no hosted DB, no API keys).
3. One deployable unit, one language (TypeScript), one validation library, one way to do each thing.

## Stack and why

| Concern                | Choice                                                             | Why this, not something else                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework              | **Next.js 16 (App Router)** + React 19 + TypeScript strict         | UI and API in one project and one deploy. Server components can read the DB directly.                                                                                                                                                              |
| Styling                | **Tailwind CSS v4** + semantic color tokens in `globals.css`       | Fast to write; a re-theme is a one-file change.                                                                                                                                                                                                    |
| Database               | **SQLite via libSQL** + **Drizzle ORM**                            | A local file DB needs zero setup on Windows (no Docker/Postgres installed). The same driver talks to **Turso** in production, so there is no dialect switch on deploy. Drizzle is plain TS with no codegen step, and its migrations are plain SQL. |
| Validation             | **Zod 4**                                                          | One schema validates forms (client) and API input (server).                                                                                                                                                                                        |
| Auth                   | **Better Auth** (email + password, DB sessions, `role` field)      | Runs on our own DB through the Drizzle adapter. No OAuth app or third-party account needed during the competition. Has built-in rate limiting and CSRF/origin checks.                                                                              |
| Unit/integration tests | **Vitest** (+ Testing Library for components)                      | Fast, ESM-native, and runs route handlers directly.                                                                                                                                                                                                |
| E2E tests              | **Playwright**                                                     | Real-browser checks of critical flows.                                                                                                                                                                                                             |
| Deploy                 | **Vercel + Turso** (primary), or `next start` on any Node 22+ host | Free tiers and git-push deploys.                                                                                                                                                                                                                   |

**Deliberately not used:** Cache Components (`cacheComponents: false`), because classic dynamic rendering has fewer surprising errors; tRPC/GraphQL, because REST plus the Zod contract is enough; a state-management library, because server components and `fetch` are enough; Docker for local dev; Google Fonts (fetched at build time, which breaks offline builds).

**Escape hatch:** if a problem _requires_ Postgres (for example PostGIS or heavy concurrent writes), switch Drizzle to `drizzle-orm/node-postgres` + Neon. Only `src/server/db/client.ts`, `columns.ts`, `drizzle.config.ts` and the schema imports (`sqlite-core` → `pg-core`) change. Allow about one hour.

## Layers

```
Browser
  │  React client components ── apiFetch() ──┐
  ▼                                          ▼
src/app/**/page.tsx (server components)    src/app/api/**/route.ts (route handlers)
  │  call services directly                  │  apiHandler() + parseJson/parseQuery (Zod)
  └──────────────┬───────────────────────────┘
                 ▼
     src/server/services/*.ts   ← business logic + authorization checks (single source of truth)
                 ▼
     src/server/db  (Drizzle + libSQL)   src/server/auth (Better Auth)   src/server/integrations
```

Rules:

- **Business logic lives only in `src/server/services/`.** Pages and route handlers stay thin.
- **Authorization is enforced in services** (or immediately in the route handler), never only in the UI or in `proxy.ts`.
- **Mutations from the browser go through `/api/*` route handlers** using `apiFetch`. Server Actions are allowed for one-off cases but are not the default pattern, so there is one way to do things.
- Anything under `src/server/` is server-only. App code imports the DB through `@/server/db`, which is marked `server-only`.

## Folder map

```
src/
  app/                      routes
    (auth)/sign-in, sign-up public auth pages (T1)
    app/                    protected area (/app/*): layout re-checks the session
      items/                reference resource pages (T3)
    api/auth/[...all]       Better Auth endpoints (T1)
    api/health              liveness + DB check
    api/items               reference resource API (T3)
    api/uploads             optional uploads (T5, off unless STORAGE_DRIVER)
    dev/ui                  component gallery (dev only)
    layout.tsx              ToastProvider + AppShell(user, nav, SignOutButton)
  components/ui|forms|layout design system, form helpers, app shell (T2)
  components/items/         reference resource components (T3)
  config/site.ts            app name + navigation (edit first in competition)
  lib/                      isomorphic code (safe for client and server)
    api/                    envelope types, server helpers, client fetcher
    validation/             Zod schemas (common, auth, items)
    auth-client.ts env.ts errors.ts utils.ts
  proxy.ts                  optimistic /app redirect (cookie check only)
  server/                   server-only code
    auth/                   Better Auth config + session contract (T1)
    db/                     client, columns, query-helpers, schema/*, seeds/*, seed.ts
    services/               business logic + authorization per resource
    integrations/http.ts    fetchJson for external APIs (T5)
    security/rate-limit.ts  in-memory rate limiter (T5)
    storage/                optional upload drivers: local (dev), s3 (T5)
    logger.ts               structured logging (T5)
  types/                    shared TS types (auth contract)
scripts/new-resource.mjs    generate a resource from the reference slice
tests/helpers|e2e|setup     test DB/session/request helpers, Playwright specs
drizzle/                    committed SQL migrations
docs/                       guides, contracts, prompts/, modules/, tasks/
```

## Key decisions log

| Date       | Decision                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-17 | Stack above chosen. Cache Components off. SQLite/libSQL over Postgres for zero-setup local dev.                             |
| 2026-11-17 | Response envelope `{ ok, data, meta? } / { ok:false, error }` fixed (docs/API_GUIDE.md).                                    |
| 2026-11-17 | Task branches never commit migrations; the coordinator generates them after merging (avoids migration-number conflicts).    |
| 2026-11-17 | Integration: root layout reads the session (all pages dynamic); `/app` layout re-checks auth; proxy only checks the cookie. |
| 2026-11-17 | Better Auth tables stay singular (adapter requirement); demo user seeded via Better Auth's `hashPassword`.                  |
| 2026-11-17 | No AWS SDK (own SigV4, verified against AWS's vector); no Dockerfile; uploads off by default.                               |
| 2026-11-17 | `scripts/new-resource.mjs` generates resources from the reference slice; rehearsed on `sample/notes-app`.                   |
