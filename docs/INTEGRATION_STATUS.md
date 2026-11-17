# Integration Status

> Maintained by the coordinator only. Every claim here was checked by running the command shown.

## Environment (inspected 2026-11-17)

| Item                         | Value                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| OS                           | Windows 11 Home (10.0.26300), Git Bash + PowerShell                                                                |
| Node / npm                   | v24.18.0 / 11.16.0 ✅ (project requires Node ≥ 22)                                                                 |
| Git                          | 2.55.0 ✅                                                                                                          |
| Not installed (not required) | Docker, PostgreSQL, pnpm, bun, GitHub CLI `gh`, Vercel CLI                                                         |
| Note                         | A stray `C:\Users\Afluk\package-lock.json` exists. It is harmless; `turbopack.root` is pinned in `next.config.ts`. |

## Module status

| Module                | Branch             | Status                      | Reviewed against contracts |
| --------------------- | ------------------ | --------------------------- | -------------------------- |
| Stage 1 core          | `main`             | ✅ verified (see checklist) | —                          |
| T1 Auth               | `task/t1-auth`     | ⏳ not started              | —                          |
| T2 UI                 | `task/t2-ui`       | ⏳ not started              | —                          |
| T4 Testing & CI       | `task/t4-testing`  | ⏳ not started              | —                          |
| T3 Reference resource | `task/t3-items`    | ⏳ blocked on Integration A | —                          |
| T5 Platform           | `task/t5-platform` | ⏳ blocked on Integration A | —                          |

## Verification checklist

| Check                          | Command                                          | Stage 1 result                                                                        |
| ------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Dependencies install           | `npm install`                                    | ✅ 0 vulnerabilities                                                                  |
| Type check                     | `npm run typecheck`                              | ✅                                                                                    |
| Lint                           | `npm run lint`                                   | ✅ 0 problems                                                                         |
| Unit tests                     | `npm test`                                       | ✅ 18/18                                                                              |
| Production build               | `npm run build`                                  | ✅                                                                                    |
| Production server              | `npm start` + `curl /api/health`                 | ✅ 200 `{"ok":true,"data":{"status":"ok","database":"ok"}}`, security headers present |
| Dev server                     | `npm run dev`                                    | ✅ 200 on `/` and `/api/health`                                                       |
| Migrations pipeline            | `db:generate` → `db:migrate` on a scratch schema | ✅ (scratch removed afterwards)                                                       |
| Seed runner                    | `npm run db:seed`                                | ✅ connects; no seeders yet                                                           |
| DB on Turso (remote)           | —                                                | ⚪ untested: no credentials available                                                 |
| Auth flows                     | —                                                | ⏳ T1                                                                                 |
| API contracts ↔ frontend usage | —                                                | ⏳ Integration A/B                                                                    |
| E2E                            | —                                                | ⏳ T4                                                                                 |
| Deployment reproducible        | —                                                | ⏳ T5                                                                                 |

## Integration log

| Date       | Event                                                                      |
| ---------- | -------------------------------------------------------------------------- |
| 2026-11-17 | Stage 1 completed and verified. Wave 2 prompts published in `docs/tasks/`. |
