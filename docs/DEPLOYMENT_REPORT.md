# Deployment rehearsal report

**Date:** 2026-11-17 · **Result:** ✅ the foundation is live in production and verified end to end.

|                |                                                                                         |
| -------------- | --------------------------------------------------------------------------------------- |
| Live URL       | https://builderthon-26-foundation.vercel.app                                            |
| GitHub         | https://github.com/muaflah786/builderthon-26-foundation (**private**, branch `main`)    |
| Vercel project | `muaflah786/builderthon-26-foundation` (Hobby, free), function region **bom1 (Mumbai)** |
| Database       | Turso `builderthon-26` (free), region **aws-ap-south-1 (Mumbai)**                       |

## 1. GitHub and CI

| Check                                                            | Result                                                                                                                                    |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Repository created (private) and `main` pushed with full history | ✅ remote `main` = local `17df3ae`                                                                                                        |
| Secrets in the repository                                        | ✅ none (`.env*` and `*.db` are git-ignored; checked before pushing)                                                                      |
| Other branches and worktrees                                     | left on the laptop only (not pushed)                                                                                                      |
| GitHub Actions run #44025346450                                  | ✅ **check** passed in 95 s (typecheck, lint, format, 25 test files, build); **e2e** passed in 97 s (**14/14** Playwright tests on Linux) |
| GitHub CLI login                                                 | `muaflah786`, scopes `repo`, `workflow`, `read:org`, `gist`; Git uses `gh` as its credential helper                                       |

## 2. Turso database

| Check                                                        | Result                                                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Database `builderthon-26` created on the free plan in Mumbai | ✅                                                                                         |
| Read-only connection test from the laptop                    | ✅                                                                                         |
| Migrations `0000_auth`, `0001_items` applied                 | ✅ 2 recorded; tables `user`, `session`, `account`, `verification`, `items`                |
| Credentials stored locally                                   | `.env.turso` (git-ignored, **not** loaded by Next.js, so local runs keep using `local.db`) |

## 3. Vercel deployment

| Check                                                                         | Result                                                                         |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Project imported from GitHub, framework Next.js, default build                | ✅                                                                             |
| 7 environment variables (Production + Preview)                                | ✅ names and value lengths verified; imported from `.env.vercel` (git-ignored) |
| First production deploy                                                       | ✅ about 1 minute                                                              |
| Function region changed from `iad1` (USA) to `bom1` (Mumbai), then redeployed | ✅ `X-Vercel-Id: bom1::bom1`; health responds in about 0.2–0.45 s              |
| Security headers                                                              | ✅ `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`                       |

## 4. Production tests

| Test                     | How it was verified                                                                                         | Result |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- | ------ |
| Health + DB connectivity | `GET /api/health` → `database: ok`                                                                          | ✅     |
| Sign-up                  | 2 real accounts created; both role `user` (role can't be self-assigned)                                     | ✅     |
| Protected routes         | signed out: `/app` → 307 to `/sign-in?next=…`; `/api/items` → 401                                           | ✅     |
| Create                   | `POST /api/items` → 201 (request logs + DB)                                                                 | ✅     |
| Search / list            | `GET /app/items?q=…` → 200 (request logs)                                                                   | ✅     |
| Edit                     | temporary item edited, still edited after reload                                                            | ✅     |
| Delete                   | `DELETE /api/items/…` → 204, row gone from DB                                                               | ✅     |
| Persistence              | items still present after refresh and across sessions (Turso)                                               | ✅     |
| User isolation           | account B opening account A's item → "Page not found"; API GET/PATCH/DELETE → **404**; item unchanged in DB | ✅     |
| Sign-out                 | session removed server-side; `/app/items` redirects to sign-in; `get-session` → null; API → 401             | ✅     |
| Logs / errors            | Vercel runtime logs: **0 errors, 0 fatal, 0 warnings** during testing                                       | ✅     |

Production data left in place: 2 accounts, 1 item (`ONE`). The temporary test item was deleted. No demo seed data was added to production.

## 5. Remaining issues and limitations

| #   | Issue                                                                                                                                                                                                                             | Severity              | Action                                                                                                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The Turso token was pasted into a chat conversation and must be treated as **exposed**                                                                                                                                            | **High**              | Turso → database → **Invalidate All Tokens** → **Create Token** → update `.env.turso`, `.env.vercel` and Vercel's `DATABASE_AUTH_TOKEN` → redeploy.                                                                                                  |
| 1b  | **Auto-deploy blocked for commits not authored by the Vercel owner.** Commit `606adbf` (author `aflahk313`, a different GitHub account) was blocked: Vercel Hobby only deploys private-repo commits from the owner (`muaflah786`) | **High** for the team | Fixed for this laptop: repo-local identity `muaflah786` (GitHub no-reply email). **Builderthon:** only the repo owner pushes to `main`, or make the competition repo public, or (paid) Vercel Pro. Teammates' own commits will otherwise not deploy. |
| 2   | Env vars are set for **Preview** as well, so any pushed non-`main` branch would get a preview deployment that writes to the **production** database                                                                               | Medium                | Before pushing other branches: in Vercel, change `DATABASE_URL`/`DATABASE_AUTH_TOKEN` to **Production only**, or give Preview its own Turso database.                                                                                                |
| 3   | Vercel account has no 2FA                                                                                                                                                                                                         | Medium                | Vercel → Account → Security → enable 2FA (same for GitHub).                                                                                                                                                                                          |
| 4   | Rate limiting is in-memory, per instance                                                                                                                                                                                          | Low                   | Acceptable for a demo (KNOWN_LIMITATIONS #3).                                                                                                                                                                                                        |
| 5   | Pages under `loading.tsx` return HTTP 200 for not-found pages (UI is correct, APIs return 404)                                                                                                                                    | Low                   | KNOWN_LIMITATIONS #4.                                                                                                                                                                                                                                |
| 6   | Production passwords were never typed by the assistant, so auth flows were exercised by the account owner (not by automated E2E against production)                                                                               | Info                  | Automated E2E covers the same flows in CI.                                                                                                                                                                                                           |

## 6. Repeat the deployment during the Builderthon (about 15 minutes)

You only need these steps if you deploy a **new** repository. For this one, `git push` to `main` redeploys automatically.

0. **Commit identity:** in the repo, `git config user.name <github-login>` and `git config user.email <id>+<github-login>@users.noreply.github.com` (get the id with `gh api user --jq .id`). Vercel Hobby blocks deploys of private-repo commits whose author isn't the project owner.
1. **GitHub:** `gh auth status` (if logged out: `gh auth login --web`, approve the code, wait for "Logged in as"). Then `gh repo create <name> --private --source . --remote origin --push`. Check **Actions** is green.
2. **Turso:** app.turso.tech → **Create Database** (region **AWS AP South (Mumbai)**) → copy the URL → **Create Token** (Never, Read & Write). Put both in `.env.turso` (git-ignored). **Never paste the token into a chat.**
3. **Migrate:** `node --env-file=.env.turso node_modules/drizzle-kit/bin.cjs migrate` → check tables. Optional demo data: `node --env-file=.env.turso --import tsx src/server/db/seed.ts`.
4. **Secrets file:** create `.env.vercel` with `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `BETTER_AUTH_SECRET` (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`), `APP_URL=https://<project>.vercel.app`, `NEXT_PUBLIC_APP_NAME`, `LOG_LEVEL=info`, `AUTH_RATE_LIMIT=on`.
5. **Vercel:** vercel.com/new → **Continue with GitHub** → **Import** the repo → open **Environment Variables** → open `.env.vercel` in Notepad, **Ctrl+A, Ctrl+C**, click the first **Key** box and press **Ctrl+V** (7 rows appear) → set **Production** only → **Create Project** → **Deploy**.
6. **Region:** Project → Settings → Functions → Function Region → select **bom1**, deselect **iad1** → **Save** → Deployments → ⋯ → **Redeploy**.
7. **Check:** `curl -i https://<project>.vercel.app/api/health` → `database: ok` and `X-Vercel-Id: bom1::bom1`. Then sign up in an incognito window and create one item.
8. If `APP_URL` differs from the real address (name already taken), update it in Vercel → Environment Variables and redeploy, otherwise sign-in fails with `INVALID_ORIGIN`.
