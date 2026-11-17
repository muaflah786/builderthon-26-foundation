# Integration status

> Maintained by the coordinator. Every ✅ was checked by running the command shown (details: [TEST_REPORT.md](TEST_REPORT.md)). ⚪ = not verified, with the reason.

**Overall: the foundation is complete on `main` and verified locally.** Remaining items need external accounts (Vercel, Turso, GitHub) and are listed under "Remaining work".

## Environment (inspected 2026-11-17)

| Item                           | Value                                                      |
| ------------------------------ | ---------------------------------------------------------- |
| OS                             | Windows 11 Home (10.0.26300), Git Bash + PowerShell        |
| Node / npm                     | v24.18.0 / 11.16.0 ✅ (project requires Node ≥ 22)         |
| Git                            | 2.55.0 ✅ · `.gitattributes` forces LF                     |
| TypeScript / ESLint / Prettier | 5.9.3 / 9.39.5 / 3.10.1 ✅                                 |
| Vitest / Playwright            | 5.1.0 / 1.65.1 + Chromium installed ✅                     |
| drizzle-kit / drizzle-orm      | 0.31.11 / 0.45.4 ✅                                        |
| Not installed (not required)   | Docker, PostgreSQL, pnpm, bun, `gh`, Vercel CLI, Turso CLI |

## Modules

| Module                | Branch → merge commit on `main`                          | Status            | Reviewed against contracts                                                                       |
| --------------------- | -------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------ |
| Stage 1 core          | `main` (`0ead582`)                                       | ✅                | —                                                                                                |
| T1 Auth               | `task/auth` `3b69c30` → `8bcfdc8`                        | ✅                | ✅ contract exact; post-auth fallback is `/app` (documented)                                     |
| T2 UI                 | `task/ui` `befa52d` → `16bb9d4`                          | ✅                | ✅ no auth imports in UI; tokens only                                                            |
| Integration A         | `main` `92e0b67`                                         | ✅                | AppShell + session + SignOut + ToastProvider; `/app` protected area; auth forms on T2 components |
| T4 Testing & CI       | `task/testing` `d6e4124` → `a1f53da`                     | ✅ (CI ⚪)        | helpers follow the auth contract                                                                 |
| T3 Reference resource | `task/items` `970a798` → `9bc06a9`                       | ✅                | ✅ envelope, authz in service, DTOs                                                              |
| T5 Platform           | `task/platform` `ec536c5` → `20137d9`                    | ✅ (S3/Vercel ⚪) | ✅                                                                                               |
| Tooling + docs        | `main` `89d62b8` and later                               | ✅                | generator, prompt library, guides                                                                |
| Sample app            | `sample/notes-app` `7b8fa29` (**not merged**, by design) | ✅                | rehearsal of the adaptation guide                                                                |

## Verification checklist

| Check                                                           | Result                                                                                       |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Dependencies install (`npm ci`)                                 | ✅ (4 moderate dev-only advisories; see TEST_REPORT)                                         |
| Dev server starts                                               | ✅                                                                                           |
| Production build                                                | ✅ no warnings                                                                               |
| Type check / lint / format                                      | ✅ / ✅ 0 problems / ✅                                                                      |
| Unit + integration tests                                        | ✅ 149/149                                                                                   |
| Browser tests (Playwright)                                      | ✅ 14/14                                                                                     |
| Database integration (local SQLite, migrations 0000–0001, seed) | ✅                                                                                           |
| API contracts ↔ frontend usage                                  | ✅ items UI uses `apiFetch` + envelope; E2E covers create/edit/delete/search                 |
| Auth + authorization                                            | ✅ sign-up/in/out, role not self-assignable, origin check, `/app` protection, cross-user 404 |
| Env vars documented                                             | ✅ [ENVIRONMENT.md](ENVIRONMENT.md)                                                          |
| Deployment reproducible                                         | ✅ Node-host path locally · ⚪ Vercel + Turso (no accounts)                                  |
| Remote DB (Turso)                                               | ⚪ no credentials                                                                            |
| GitHub Actions CI                                               | ⚪ no remote                                                                                 |
| S3/R2 uploads                                                   | ⚪ no credentials (signer verified against the AWS vector)                                   |

## Integration decisions log

| Date       | Decision                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-17 | Merge order T1 → T2 (disjoint files, no conflicts) → Integration A → T4 → T3 → T5. All task branches merged with `--no-ff`. |
| 2026-11-17 | Root layout reads the session (`getSessionUser`), so all pages are dynamic. Accepted for simplicity.                        |
| 2026-11-17 | `AUTH_RATE_LIMIT=off` added for E2E only; production rejects placeholder `BETTER_AUTH_SECRET`.                              |
| 2026-11-17 | Migrations generated and committed by the coordinator (`0000_auth`, `0001_items`).                                          |
| 2026-11-17 | `loading.tsx` kept: page-level `notFound()` returns 200 + not-found UI (Next 16 streaming); APIs return real 404s.          |
| 2026-11-17 | Local upload driver uses `turbopackIgnore` to keep `uploads/` out of server bundle tracing.                                 |
| 2026-11-17 | No Dockerfile, no AWS SDK (not needed; documented alternatives).                                                            |

## Repository hygiene notes

- Worktrees: `bt-t1` (task/auth), `bt-t2` (task/ui), `bt-t3` (task/items), `bt-t4` (task/testing), `bt-t5` (task/platform). All are merged and clean, and can be removed with `git worktree remove ../bt-tN` when no longer needed (branches are kept).
- Two extra worktrees under `.claude/worktrees/` (`claude/isolated-worktree-setup-a4d18b`, `claude/t2-ui-components-40c4cd`) point at the old commit `8393850` and contain no changes. They were left untouched; remove them only if nobody is using them.
- A `next dev` server from `bt-t1` was found running on port 3000 during integration. It was left running. Stop it before using port 3000.

## Remaining work (needs the team's accounts)

1. Create a GitHub repo, push `main`, and confirm the CI workflow passes.
2. Create Turso DB + Vercel project; run the full rehearsal deploy in [DEPLOYMENT.md](DEPLOYMENT.md); mark those rows ✅.
3. Optional: test R2 uploads once with real credentials.
