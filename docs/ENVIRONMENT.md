# Environment variables

Single source of truth: `src/lib/env.ts` (validated with Zod at startup; the app refuses to start with an invalid value and prints which one). Template: `.env.example`. Local values go in `.env.local` (git-ignored). On a host, set them in its dashboard.

| Variable                                                                                | Required                 | Default                 | Used by                                          | Notes                                                                                                                                                             |
| --------------------------------------------------------------------------------------- | ------------------------ | ----------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                          | no                       | `file:./local.db`       | DB client, drizzle-kit                           | `libsql://<db>.turso.io` in production. Serverless hosts **cannot** use `file:`.                                                                                  |
| `DATABASE_AUTH_TOKEN`                                                                   | with Turso               | —                       | DB client, drizzle-kit                           | Turso database token.                                                                                                                                             |
| `BETTER_AUTH_SECRET`                                                                    | **production**           | dev-only value          | Better Auth                                      | ≥ 32 chars; the `.env.example` placeholder is **rejected** in production. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `APP_URL`                                                                               | production               | `http://localhost:3000` | Better Auth (origin/CSRF check, cookie `Secure`) | Exactly the public origin, no trailing slash.                                                                                                                     |
| `AUTH_RATE_LIMIT`                                                                       | no                       | `on`                    | Better Auth                                      | `off` only for automated E2E runs.                                                                                                                                |
| `LOG_LEVEL`                                                                             | no                       | `info`                  | `src/server/logger.ts`                           | `debug` \| `info` \| `warn` \| `error`.                                                                                                                           |
| `STORAGE_DRIVER`                                                                        | no                       | unset (uploads off)     | `/api/uploads`                                   | `local` (dev only) or `s3`.                                                                                                                                       |
| `UPLOAD_MAX_BYTES`                                                                      | no                       | `5242880` (5 MB)        | `/api/uploads`                                   |                                                                                                                                                                   |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` | when `STORAGE_DRIVER=s3` | —                       | S3 driver                                        | Validated together. `S3_REGION` defaults to `auto` (R2).                                                                                                          |
| `NEXT_PUBLIC_APP_NAME`                                                                  | no                       | `Builderthon App`       | `src/config/site.ts`                             | **Public**: inlined into browser JS at build time. Rebuild after changing it.                                                                                     |

Rules:

- Add a variable to **both** `src/lib/env.ts` and `.env.example`, in the same commit. Never read `process.env` elsewhere (except `NEXT_PUBLIC_*` in `src/config/site.ts`).
- Never put secrets in `NEXT_PUBLIC_*` variables.
- Test-only values live in `playwright.config.ts` and `.github/workflows/ci.yml`. They are deliberately not real secrets.

## External services and credentials (all optional for local development)

| Service                   | Needed for                                         | Free tier   | What to obtain                | Status                  |
| ------------------------- | -------------------------------------------------- | ----------- | ----------------------------- | ----------------------- |
| Turso                     | production database                                | yes         | DB URL + token                | ⚪ not set up           |
| Vercel                    | hosting                                            | yes (Hobby) | account linked to GitHub      | ⚪ not set up           |
| GitHub                    | repo + CI                                          | yes         | repo (push the `main` branch) | ⚪ no remote configured |
| Cloudflare R2 (or any S3) | production uploads, only if the product needs them | yes         | bucket, API token, public URL | ⚪ not set up           |
| Any problem-specific API  | only if the product needs it                       | varies      | API key → new env var         | —                       |
