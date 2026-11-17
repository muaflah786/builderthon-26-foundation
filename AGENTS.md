<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project rules (Builderthon '26 Foundation)

This repo is a reusable competition foundation coordinated across several conversations. Before changing anything:

1. Read `docs/ARCHITECTURE.md`, `docs/MODULE_CONTRACTS.md` and `docs/TASK_OWNERSHIP.md`.
2. If you are working on a task (`docs/tasks/Tn-*.md`), edit only the paths that task owns and follow `docs/tasks/_COMMON.md`.
3. Use the shared contracts and never re-implement them: `AppError` (`src/lib/errors.ts`), the API envelope + `apiHandler`/`parseJson`/`parseQuery` (`src/lib/api/server.ts`), `apiFetch` (`src/lib/api/client.ts`), `env` (`src/lib/env.ts`), `db` (`src/server/db`), `cn` (`src/lib/utils.ts`).
4. Business logic and authorization belong in `src/server/services/`. Route handlers and pages stay thin.
5. Never commit files in `drizzle/` from a task branch. Never commit `.env.local` or `*.db`.
6. Run `npm run check` and `npm run build` before declaring work done. Report anything unverified as UNTESTED.
7. New CRUD resource: run `npm run new-resource -- <singular> <plural>` instead of hand-writing it, then edit fields. Never drop one table and create another in the same `npm run db:generate` (drizzle-kit prompts interactively and crashes); generate them separately.
8. Pages render inside the root AppShell's `<main>`: don't add another `<main>`. Protected pages go under `src/app/app/`.
9. Start every competition task from `docs/QUICKSTART.md` and the prompts in `docs/prompts/`.
