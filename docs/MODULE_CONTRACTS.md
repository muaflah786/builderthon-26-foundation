# Module Contracts

**Status 2026-11-17: every contract below is implemented and tested on `main`.** These interfaces are **frozen** for parallel work. To change one, ask the coordinator, who updates this file first.

## Capability classification

| #   | Capability                                                                | Class                                                                | Module                                     |
| --- | ------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------ |
| 1   | Project setup, config, scripts, env validation                            | **Core**                                                             | Stage 1 (done)                             |
| 2   | Frontend routing, app shell, error/404/loading pages                      | **Core**                                                             | T2 ✅                                      |
| 3   | Design system + reusable UI components                                    | **Core**                                                             | T2 ✅                                      |
| 4   | Backend/API infrastructure (envelope, handler wrapper, client fetcher)    | **Core**                                                             | Stage 1 (done)                             |
| 5   | DB connection, column conventions, migrations, seed runner                | **Core**                                                             | Stage 1 (done)                             |
| 6   | Authentication (email+password) and role-based authorization              | **Core**                                                             | T1 ✅                                      |
| 7   | Forms, validation, error display                                          | **Core**                                                             | Stage 1 + T2 ✅                            |
| 8   | Search, filter, sort, pagination pattern (reference resource)             | **Core**                                                             | T3 ✅                                      |
| 9a  | External HTTP API client pattern (timeout, retry, Zod-parsed)             | **Core**                                                             | T5 ✅                                      |
| 9b  | File uploads/storage (local disk in dev, S3-compatible in prod)           | **Optional**, off by default                                         | T5 ✅                                      |
| 10  | Security defaults: headers, input validation, authz checks, rate limiting | **Core**                                                             | Stage 1 + T1 + T5 ✅                       |
| 11  | Testing: Vitest unit/integration, Playwright E2E, CI                      | **Core**                                                             | Stage 1 + T4 ✅ (CI not yet run on GitHub) |
| 12  | Deployment config + documentation                                         | **Core**                                                             | T5 ✅                                      |
| —   | OAuth/social login, email verification, password reset emails             | **Optional**: documented recipe, not built                           | T1 docs                                    |
| —   | Realtime (websockets/SSE), background jobs                                | **Optional**: recipe only if time allows                             | —                                          |
| —   | AI/LLM, maps, payments, i18n, analytics dashboards, multi-tenancy         | **Not included** (domain-specific; add only if the problem needs it) | —                                          |

## Shared contracts (already implemented, Stage 1)

| Contract         | File                             | Notes                                                                                                      |
| ---------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Env vars         | `src/lib/env.ts`, `.env.example` | Add vars in **both**. Never read `process.env` elsewhere (except `NEXT_PUBLIC_*` in `src/config/site.ts`). |
| Errors           | `src/lib/errors.ts`              | `AppError` + `ErrorCode` → HTTP status map.                                                                |
| API envelope     | `src/lib/api/types.ts`           | `ApiSuccess` / `ApiFailure` / `PageMeta`.                                                                  |
| Route helpers    | `src/lib/api/server.ts`          | `apiHandler`, `ok`, `created`, `paginated`, `noContent`, `parseJson`, `parseQuery`, `parseParams`.         |
| Client fetcher   | `src/lib/api/client.ts`          | `apiFetch`, `apiFetchPage`, `ApiClientError` (`.fieldErrors`).                                             |
| Validation       | `src/lib/validation/common.ts`   | `listQuerySchema`, `idParamSchema`, `optionalText`, `pageMeta`, `pageOffset`.                              |
| DB               | `src/server/db`                  | `db` (server-only), `idColumn()`, `timestamps()`.                                                          |
| Auth types       | `src/types/auth.ts`              | `Role`, `SessionUser`.                                                                                     |
| Class names      | `src/lib/utils.ts`               | `cn()`.                                                                                                    |
| App identity/nav | `src/config/site.ts`             | `siteConfig.name`, `siteConfig.nav`.                                                                       |

## Auth contract (T1 implements; everyone else consumes)

`src/server/auth/session.ts` (server-only):

```ts
getSessionUser(): Promise<SessionUser | null>   // null when signed out; never throws for that
requireUser(): Promise<SessionUser>             // throws AppError UNAUTHENTICATED (401)
requireRole(role: Role): Promise<SessionUser>   // 401 if signed out, 403 if role mismatch; admin satisfies any role
```

`src/lib/auth-client.ts` (client): exports `authClient` (Better Auth React client) plus `signIn`, `signUp`, `signOut`, `useSession`.

Routes: `/sign-in`, `/sign-up` (public). After sign-in, redirect to the `?next=` param if it is a **relative** path, else `/app`. `src/proxy.ts` does only an _optimistic_ redirect to `/sign-in?next=...` for paths under `/app` (protected area) when no session cookie exists. Real checks happen in services and handlers.

Users table: Better Auth's `user` table plus `role` (`"user" | "admin"`, default `"user"`, **not settable by sign-up input**).

## UI contract (T2 implements)

- `src/components/ui/*`: one component per file, named exports, kebab-case file names (`button.tsx` → `Button`). Every component accepts `className` merged with `cn()` and forwards native props (`...props`). Use semantic tokens only (`bg-primary`, `text-muted-foreground`, `border-border`). No hard-coded hex colors.
- Required primitives: `Button` (variants: primary, secondary, ghost, danger; sizes; `loading`), `Input`, `Textarea`, `Select` (native), `Checkbox`, `Label`, `Card`, `Badge`, `Alert`, `Spinner`, `Dialog` (native `<dialog>`), `Table` parts, `Pagination` (URL-driven: reads/writes `?page=`), `EmptyState`, `Toast` (minimal, context-based).
- `src/components/forms/*`: `FormField` (label + control + error + hint, accessible ids), `FormError` (top-level error alert), `useApiForm` hook: submits to `apiFetch`, exposes `{ pending, fieldErrors, formError, onSubmit }`, maps `ApiClientError.fieldErrors`.
- `src/components/layout/*`: `AppShell` / `SiteHeader` take `user: SessionUser | null` **as a prop** (no auth import inside T2 files). Render a sign-out control through a `userMenu` slot (ReactNode) the coordinator wires up at integration.

## Reference resource contract (T3)

`items`: `id, ownerId → user.id (cascade), title (1–200), description (≤5000, optional), status ("open" | "in_progress" | "done"), createdAt, updatedAt`. Owner-scoped: users see/edit only their own; admins see all. Not-owned resources return **404**. This is a **template to copy/rename**, clearly labelled as such.

## Integrations contract (T5)

- `src/server/integrations/http.ts`: `fetchJson(url, { schema, timeoutMs=10000, retries=2, headers })` → parsed data or throws `AppError("INTERNAL_ERROR")` with the upstream error logged.
- `src/server/storage/*`: `StorageDriver { put(key, bytes, contentType), getUrl(key), delete(key) }` with a `local` driver (writes to `./uploads`, dev only) and an `s3` driver (S3-compatible). Selected by `STORAGE_DRIVER` env var. Upload route disabled unless `STORAGE_DRIVER` is set.
- `src/server/security/rate-limit.ts`: `rateLimit({ key, limit, windowMs })` (in-memory; documented as per-instance only).

## Contracts added during completion (implemented)

| Contract            | File                                           | Notes                                                                                                                          |
| ------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Logger              | `src/server/logger.ts`                         | `logger.debug/info/warn/error(message, context)`; JSON lines in production; `LOG_LEVEL`. Used by `toErrorResponse` and health. |
| Query helpers       | `src/server/db/query-helpers.ts`               | `escapeLike`, `containsInsensitive`, `orderByFrom`, `pageWindow` (replaces the planned `paginate`).                            |
| Storage             | `src/server/storage`                           | `getStorage(): StorageDriver                                                                                                   | null`; `local`refuses production; keys must match`UPLOAD_KEY_PATTERN`. |
| Test helpers        | `tests/helpers/{db,auth,request}.ts`           | `setupTestDb/resetTestDb`, `sessionModuleMock/mockSession/makeUser`, `callRoute/jsonRequest`. Alias `@tests/*`.                |
| Demo data           | `src/server/db/seeds/demo-user.ts`             | `ensureDemoUser(db)` → id of `demo@example.com` (password `demo-password-123`).                                                |
| Resource generator  | `scripts/new-resource.mjs`                     | `npm run new-resource -- <singular> <plural>`.                                                                                 |
| UI page conventions | `src/app/layout.tsx`, `src/app/app/layout.tsx` | Pages render inside AppShell's `<main>`; never add another `<main>`. Protected pages live under `src/app/app/`.                |

## T6 Universal Website AI Assistant (implemented on `task/universal-ai-assistant`)

| Contract        | File                                                                                  |
| --------------- | ------------------------------------------------------------------------------------- |
| Widget          | `AssistantWidget({ config: AssistantClientConfig })` from `@/components/assistant`    |
| Site definition | `AssistantSiteDefinition` registered in `src/server/assistant/sites.ts`               |
| Knowledge       | `WebsiteKnowledgeConfig` + `content/assistant/<site>/*.md`; `Retriever` interface     |
| Providers       | `AiProvider` (`stream`, `health`), `resolveProvider()` (one provider, no fallback)    |
| Wire format     | `POST /api/assistant/chat` → NDJSON `ChatStreamEvent` (`meta`/`delta`/`done`/`error`) |

Details: `docs/T6_ARCHITECTURE.md`.

## Naming and code conventions

- Files kebab-case; React components PascalCase; hooks `use-*.ts` exporting `useX`.
- Server-only modules start with `import "server-only";`, except files that Node scripts must import (`src/server/db/client.ts`, `src/lib/env.ts`).
- Client components start with `"use client";` and never import from `src/server/**`.
- Zod schemas: `<verb><Resource>Schema` (`createItemSchema`); inferred types `<Verb><Resource>Input`.
- Prettier (`npm run format`) is the only formatting authority.
