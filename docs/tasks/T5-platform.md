# T5: Integrations, Security Extras & Deployment (wave 3)

**Branch:** `task/t5-platform` (from `main` **after Integration A**) · **Read first:** `docs/tasks/_COMMON.md`

## Objective

Provide ready-to-use patterns for calling external APIs, rate limiting, and (optional, off by default) file uploads. Then make deployment reproducible and documented.

## You own

- `src/server/integrations/**`, `src/server/storage/**`, `src/server/security/**`
- `src/app/api/uploads/**`
- `docs/DEPLOYMENT.md`, `vercel.json` (only if needed), `Dockerfile`, `.dockerignore`
- `docs/modules/t5-platform.md`

## Must not modify

Anything else. New env vars → put the exact `src/lib/env.ts` + `.env.example` additions under "Requests to coordinator" (all **optional** with safe defaults). Until they are merged, read them through a small local parser in your module and note this in the report.

## Dependencies allowed

`@aws-sdk/client-s3` **only if** you implement the S3 driver with it. Prefer a dependency-free implementation if it is simple enough. Justify the choice in the report.

## Requirements

1. **`integrations/http.ts`**: `fetchJson<S>(url, { schema, method, body, headers, timeoutMs = 10_000, retries = 2 })`. Uses `AbortSignal.timeout`, retries only idempotent methods on network errors/5xx/429 with backoff, validates the response with Zod, and throws `AppError("INTERNAL_ERROR", "Upstream service failed")` (log details server-side, never leak upstream bodies). Unit tests with mocked `fetch`: success, timeout, retry then success, schema mismatch.
2. **`integrations/README.md`**: a 10-line recipe "add a new external API" (env var for key, a typed wrapper function in `integrations/<service>.ts`, never call it from client code).
3. **`security/rate-limit.ts`**: fixed-window in-memory limiter `rateLimit({ key, limit, windowMs })` → `{ success, remaining, resetAt }` and `assertRateLimit(...)` that throws `AppError("RATE_LIMITED")`. Plus `clientIp(req)` from `x-forwarded-for`/`x-real-ip`. Document that it is per-instance only (fine for a demo; a Redis/Upstash recipe goes in docs). Tests with fake timers.
4. **Storage (optional module)**: `storage/index.ts` → `getStorage(): StorageDriver | null` (null when `STORAGE_DRIVER` is unset). Drivers: `local` (writes under `./uploads/`, served via `GET /api/uploads/[key]` with the correct content type; refuses to run when `NODE_ENV=production`) and `s3` (S3-compatible: AWS S3, Cloudflare R2, Supabase Storage). `POST /api/uploads`: `requireUser`, multipart `file`, max size from env (default 5 MB), MIME allow-list (images + pdf by default), random key `crypto.randomUUID()` + safe extension, returns `{ key, url }`. If storage is disabled, return 404. Path traversal impossible (validate key format with a regex). The S3 driver is **UNTESTED** unless you have credentials. Say so.
5. **Deployment** `docs/DEPLOYMENT.md`, reproducible step by step:
   - **Primary: Vercel + Turso.** Create the Turso DB (CLI or dashboard), get the URL + token, set env vars on Vercel (`DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `BETTER_AUTH_SECRET`, `APP_URL`, `NEXT_PUBLIC_APP_NAME`), run migrations against Turso from a laptop (`npm run db:migrate` with prod env), deploy, verify `/api/health`.
   - **Alternative: any Node host / VPS** with `npm ci && npm run build && npm run db:migrate && npm start`, and a `Dockerfile` (multi-stage, `output: "standalone"` is a coordinator change, so request it if you use it).
   - Pre-deploy checklist + rollback notes + "local.db does not work on serverless" warning.
   - Mark every step you could not actually execute as **UNTESTED**.
6. Verify the Dockerfile builds **only if** Docker is available. It is not installed on the coordinator's machine, so expect UNTESTED.

## Acceptance criteria

- [ ] Unit tests for `http.ts`, `rate-limit.ts`, upload validation (size/MIME/key regex), local storage driver (temp dir).
- [ ] With `STORAGE_DRIVER=local`: manual upload via curl as a signed-in user works; signed out → 401; >limit → 413; `.exe` → 422; storage unset → 404.
- [ ] `npm run check` and `npm run build` pass.
- [ ] `docs/DEPLOYMENT.md` complete, with verified/untested markers.
