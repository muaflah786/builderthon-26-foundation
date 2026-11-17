# Deployment

Legend: ✅ verified · ⚪ UNTESTED

> **Option A was rehearsed for real on 2026-11-17.** Follow the tested, step-by-step version in [DEPLOYMENT_REPORT.md §6](DEPLOYMENT_REPORT.md). It also covers the Mumbai function region and the `.env.turso`/`.env.vercel` approach that keeps tokens out of chats and Git.

## Pre-deploy checklist (every time)

```bash
npm run check          # typecheck + lint + unit tests
npm run build          # production build
npm run test:e2e       # browser tests against a production build
```

- [ ] New schema changes have a committed migration (`npm run db:generate`).
- [ ] New env vars are in `src/lib/env.ts` **and** `.env.example`, and set on the host.
- [ ] `BETTER_AUTH_SECRET` is a fresh random value (production refuses the `.env.example` placeholder).
- [ ] `APP_URL` is exactly the public URL (`https://...`, no trailing slash). The auth origin check depends on it.

> ⚠️ **`file:./local.db` does not work on serverless hosts** (Vercel, Netlify): the disk is read-only/ephemeral. Use Turso (below) or a host with a persistent disk.

## Option A (primary): Vercel + Turso ⚪

Free tiers are enough for a demo. Needs a GitHub repo, a Vercel account and a Turso account.

### 1. Create the database (Turso) ⚪

Dashboard (https://app.turso.tech) → **Create database** (choose the region closest to the judges) → copy the **URL** (`libsql://<db>-<org>.turso.io`) → **Generate token** (read/write).

CLI alternative (macOS/Linux/WSL): `turso db create builderthon` · `turso db show builderthon --url` · `turso db tokens create builderthon`.

### 2. Apply migrations to Turso from your laptop ⚪

```bash
# PowerShell
$env:DATABASE_URL="libsql://<db>-<org>.turso.io"; $env:DATABASE_AUTH_TOKEN="<token>"; npm run db:migrate
# optional demo data:
$env:DATABASE_URL="libsql://..."; $env:DATABASE_AUTH_TOKEN="<token>"; npm run db:seed
```

(Git Bash: `DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... npm run db:migrate`.) `drizzle.config.ts` uses the libSQL driver, which works for both `file:` and `libsql://` URLs. Remote use is UNTESTED until the first real deploy.

### 3. Deploy on Vercel ⚪

1. Push the repo to GitHub.
2. Vercel → **Add New → Project** → import the repo. Framework preset: **Next.js**. Build command: default (`next build`). Node.js version: **22.x or later**.
3. **Environment variables** (Production and Preview):

   | Name                   | Value                                                                                   |
   | ---------------------- | --------------------------------------------------------------------------------------- |
   | `DATABASE_URL`         | `libsql://<db>-<org>.turso.io`                                                          |
   | `DATABASE_AUTH_TOKEN`  | Turso token                                                                             |
   | `BETTER_AUTH_SECRET`   | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`           |
   | `APP_URL`              | `https://<project>.vercel.app` (update after the first deploy if needed, then redeploy) |
   | `NEXT_PUBLIC_APP_NAME` | your product name                                                                       |
   | `LOG_LEVEL`            | `info`                                                                                  |

4. Deploy, then verify:
   - `https://<project>.vercel.app/api/health` → `{"ok":true,"data":{"status":"ok","database":"ok",...}}`
   - Sign up in an incognito window → lands on `/app`.

Notes: Vercel runs multiple instances, so the in-memory rate limiters (Better Auth and `rateLimit()`) are best-effort, per instance. Preview deployments get different URLs, so set `APP_URL` per environment or test auth only on production.

## Option B: any Node host or VPS (Railway, Render, a lab machine) ✅ locally

The same commands were verified locally on Windows against a fresh SQLite file:

```bash
npm ci
npm run build
npm run db:migrate                     # with production DATABASE_URL set
NODE_ENV=production npm start          # serves on $PORT (default 3000)
```

- With a persistent disk you can keep SQLite: `DATABASE_URL=file:/data/app.db` (one instance only).
- Put it behind HTTPS (the host's proxy) and set `APP_URL` to the https URL. Cookies become `Secure` automatically.
- Health check path for the host: `/api/health` (returns 503 if the DB is unreachable).

**Docker:** not included on purpose. Docker isn't installed on the team machines, and both options above deploy without it. If a host requires an image, add `output: "standalone"` to `next.config.ts` and a two-stage Dockerfile (`node:22-alpine`: `npm ci && npm run build`, then copy `.next/standalone`, `.next/static` and `public`).

## Optional: uploads in production (S3-compatible) ⚪

`STORAGE_DRIVER=local` is development-only (the server refuses it in production). For production use an S3-compatible bucket, e.g. **Cloudflare R2** (free tier, no egress fees):

1. R2 → create bucket → **Settings → Public access** (r2.dev URL or custom domain) → copy the public URL.
2. R2 → **Manage API tokens** → create a token with Object Read & Write for that bucket → copy the access key id/secret and the S3 endpoint `https://<account-id>.r2.cloudflarestorage.com`.
3. Set `STORAGE_DRIVER=s3`, `S3_ENDPOINT`, `S3_REGION=auto`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`.

The SigV4 signer is unit-tested against AWS's published example. Real uploads to a bucket are UNTESTED.

## Rollback

- Vercel: **Deployments → previous deployment → Promote to Production** (instant).
- Database: migrations are forward-only. Before risky schema changes, branch the Turso DB (`turso db create backup --from-db builderthon`) or export it. Prefer additive changes (new nullable columns) during the competition.

## Strict rate limiting (if ever needed)

Replace the in-memory store with Upstash Redis (`@upstash/ratelimit`) inside `src/server/security/rate-limit.ts` (same function signature), and set Better Auth's `rateLimit.storage` to `"database"` or `"secondary-storage"`.
