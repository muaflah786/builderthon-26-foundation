# 07: Claude implementation (one task / vertical slice)

```text
Implement this task in the current repository/branch.

TASK: <<paste the task file docs/tasks/<id>.md, or describe: entity, fields, rules, screens>>

Before coding, read: AGENTS.md, docs/ARCHITECTURE.md, docs/MODULE_CONTRACTS.md,
docs/API_GUIDE.md, docs/DATABASE_GUIDE.md, docs/modules/t3-items.md. This is Next.js 16:
check node_modules/next/dist/docs/ before using any Next API you are unsure about.

How to build it (follow the reference "items" slice exactly):
1. Validation: src/lib/validation/<x>.ts (create/update/list schemas + DTO type).
2. Schema: src/server/db/schema/<x>.ts (idColumn, timestamps, FKs with onDelete, indexes).
   Then `npm run db:generate` and `npm run db:migrate`, and commit the migration WITH the schema.
3. Service: src/server/services/<x>.ts. All business rules and authorization here.
   Not-owned rows → AppError.notFound. Return DTOs, never raw rows with secrets.
4. API: src/app/api/<x>/route.ts and [id]/route.ts with apiHandler + parseJson/parseQuery/
   parseParams + requireUser/requireRole.
5. UI under src/app/app/<x>/ using components in src/components/ui and forms; put
   resource components in src/components/<x>/.
6. Tests: validation, service (incl. another user → 404), route (401/422/201/204) using
   tests/helpers/{db,auth,request}.ts; one Playwright spec for the main flow.
7. Seeder in src/server/db/seeds/<x>.ts if demo data helps (idempotent).

Only edit the files this task owns: <<LIST>>. For shared files (site.ts nav, env.ts,
seed.ts registration) either make the minimal change if I am the integrator, or list
the exact lines for the integrator.

Rules: no fake functionality, no new dependencies without asking, keep it simple.
Finish with `npm run check`, `npm run build` and (if UI changed) `npm run test:e2e`,
then report: files changed, what you verified (command → result), UNTESTED items,
and requests for the integrator.
```
