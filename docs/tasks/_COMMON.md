# Common rules for every task conversation

Paste the task prompt (`docs/tasks/Tn-*.md`) into a **new** Claude Code conversation opened on that task's own worktree/branch. These common rules apply to every task.

## Setup (once per task)

From the main checkout (`BUILDERTHON-26-FOUNDATION`, branch `main`, with Stage 1 committed):

```bash
git worktree add ../bt-<task> -b task/<task-branch>
cd ../bt-<task>
npm install
cp .env.example .env.local
npm run check
```

(Or in the Claude desktop app, start the session with "worktree" enabled on branch `task/<task-branch>`.)

## Before writing code, read

`AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/MODULE_CONTRACTS.md`, `docs/TASK_OWNERSHIP.md`, and the guide for your area (`API_GUIDE`, `DATABASE_GUIDE`, `TESTING_GUIDE`, `SECURITY_CHECKLIST`). This is Next.js **16**. Read the relevant page in `node_modules/next/dist/docs/` before using a Next API (for example, `middleware` is now `proxy.ts`).

## Hard rules

1. Edit **only** paths your task owns (see `docs/TASK_OWNERSHIP.md`). Need something else changed? Put it under "Requests to coordinator" in your report. Do not do it yourself.
2. Do not change any frozen contract in `docs/MODULE_CONTRACTS.md`.
3. Do not edit `package.json`, except to `npm install` the dependencies your prompt explicitly allows. List them in your report.
4. Do not commit anything in `drizzle/`. Use `npm run db:push` locally.
5. No fake functionality: no buttons that do nothing, no mocked data in production code paths. If something cannot be verified (missing credentials), implement it correctly and mark it **UNTESTED** in the report.
6. No domain-specific features (this is a reusable foundation).
7. Keep it simple: the simplest implementation that meets the acceptance criteria.

## Definition of done

- `npm run check` passes (typecheck + lint + tests) and `npm run build` passes.
- Acceptance criteria in your prompt are each verified (by a test or by a described manual check).
- `docs/modules/<task>.md` written: what exists, how to use it, known limitations.
- Commit on your task branch (conventional message, e.g. `feat(auth): ...`). Do **not** merge into `main`.

## Completion report (paste back into the master conversation)

```
TASK: Tn <name>   BRANCH: task/...   COMMIT: <sha>
FILES CREATED/CHANGED: <list>
DEPENDENCIES ADDED: <none | list>
CONTRACT IMPLEMENTATION: <each contract item → file:function>
VERIFIED: <command → result, for check/build/each acceptance criterion>
UNTESTED: <anything not verified and why>
REQUESTS TO COORDINATOR: <changes needed in files you don't own>
KNOWN ISSUES / FOLLOW-UPS:
```
