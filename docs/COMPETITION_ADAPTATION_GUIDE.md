# Competition Adaptation Guide

The problem statement has arrived. Follow this guide in order.

## T+0:00 to 0:20 — Understand and decide (all three together)

1. Read the problem twice. Write in `docs/PROBLEM.md`: the users, the 3 to 5 core user stories, what the judges will demo, and what is explicitly out of scope.
2. List the **entities** (nouns) and their fields. Usually 2 to 4 tables is enough.
3. Decide which optional modules you need (uploads? external API? admin role?). Ignore everything else.
4. Split the work by **entity/feature**, not by layer. Each person owns full vertical slices (schema → service → API → UI).

## T+0:20 to 0:40 — Adapt the foundation (one person, others start designing UI)

```bash
git checkout -b competition
cp .env.example .env.local     # if not done
```

- [ ] `src/config/site.ts`: app name, description, nav items.
- [ ] `.env.local`: `NEXT_PUBLIC_APP_NAME`.
- [ ] `src/app/globals.css`: swap `--primary` (and others) for the product's colors.
- [ ] `src/app/page.tsx`: the real landing content.
- [ ] Commit and push, so everyone pulls the same base.

## Add a resource: generate it from the reference "items" slice (about 15 minutes per entity)

Rehearsed end to end on branch `sample/notes-app` (docs/SAMPLE_APP.md there): all tests and E2E passed.

**Step 1: not using "items"? Remove it first, in its own migration.**
Delete `src/lib/validation/items*.ts`, `src/server/db/schema/items.ts`, `src/server/db/seeds/items.ts`, `src/server/services/items*.ts`, `src/app/api/items/`, `src/app/app/items/`, `src/components/items/`, `tests/e2e/items.spec.ts`. Also remove the "Items" nav entry in `src/config/site.ts` and the seeder lines in `src/server/db/seed.ts`. Then:

```bash
npm run db:generate      # creates "DROP TABLE items" (no prompts)
```

> ⚠️ Do the drop **before** generating new tables. If one `db:generate` both drops a table and creates another, drizzle-kit asks interactively whether it is a rename, and it crashes in non-interactive shells (Claude, CI).

(Easiest alternative: keep "items" by generating your first resource _from_ it, then delete it at the end.)

**Step 2: generate each resource.**

```bash
npm run new-resource -- task tasks      # <singular> <plural>, lowercase
```

It copies schema, validation, service, API routes, pages, components, seeder, unit tests and the E2E spec, renaming everything. It refuses to overwrite files and prints the two shared-file lines to add (nav entry + seeder registration).

**Step 3: make it yours.**

1. Edit fields in `src/server/db/schema/<plural>.ts` **and** `src/lib/validation/<plural>.ts` (keep them in sync), then the form (`src/components/<plural>/<singular>-form.tsx`), the list columns (`src/app/app/<plural>/page.tsx`) and the status badge if you changed statuses.
2. Update the generated tests for the new fields/values (they encode the reference behaviour).
3. `npm run db:generate && npm run db:migrate`. Commit the migration **with** the schema change.
4. `npm run check` (and `npm run test:e2e` before integrating).

## Patterns cheat sheet

| Need                               | Use                                                            |
| ---------------------------------- | -------------------------------------------------------------- |
| Public read-only page              | server component calling a service directly                    |
| Protected page                     | put it under `src/app/app/` (layout already requires login)    |
| Admin-only                         | `await requireRole("admin")` in the page/handler/service       |
| Form → create/update               | `useApiForm` + `FormField` + shared Zod schema                 |
| List with search/filter/pagination | copy items list page + `listQuerySchema(...).extend({...})`    |
| Call a 3rd-party API               | `fetchJson` from `src/server/integrations/http.ts`, key in env |
| File upload                        | enable `STORAGE_DRIVER` (see `docs/DEPLOYMENT.md`)             |
| Expensive public endpoint          | `rateLimit(...)` from `src/server/security/rate-limit.ts`      |
| Make a user admin                  | `npm run db:studio`, then set `user.role = "admin"`            |
| Demo login                         | `npm run db:seed` → `demo@example.com` / `demo-password-123`   |

## Team workflow during the competition

- One branch `competition`; small commits; `git pull --rebase` before pushing.
- **Never** edit someone else's slice without telling them. Shared files (`site.ts`, `globals.css`, schema of another entity) are changed by one announced person.
- Schema change = migration in the same commit. Pull, then run `npm run db:migrate`.
- Every 60 to 90 minutes: `npm run check && npm run build`, then deploy (see `docs/DEPLOYMENT.md`). Deploy early. A deployed 70% beats a local 100%.
- Last 45 minutes: feature freeze, fix bugs, seed demo data, rehearse the demo path.

## Demo-readiness checklist

- [ ] Seed script creates realistic demo data and a demo login (shown on the sign-in page only in development).
- [ ] Production deploy works from a clean browser (incognito).
- [ ] Empty states, loading states and error messages look intentional.
- [ ] No console errors on the demo path.
- [ ] README updated: what it does, how to run it, demo credentials.
