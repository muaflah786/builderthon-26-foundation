# 04: Product architecture (map the product onto the foundation)

```text
You are the software architect. Map our product onto the existing foundation in this
repository. Read first: AGENTS.md, docs/ARCHITECTURE.md, docs/MODULE_CONTRACTS.md,
docs/API_GUIDE.md, docs/DATABASE_GUIDE.md, docs/COMPETITION_ADAPTATION_GUIDE.md and the
reference slice (src/server/services/items.ts and files listed in docs/modules/t3-items.md).

PRODUCT PLAN:
<<PASTE THE OUTPUT OF PROMPT 01 (pitch, journey, MUST features, entities)>>

Write docs/PRODUCT.md containing:
1. Entities → one Drizzle table each: columns (name, type, null/default), foreign keys
   with onDelete, indexes, and the access rule (who can read/write which rows).
   Follow DATABASE_GUIDE conventions. Reuse the auth `user` table; do not modify it
   except to propose role values.
2. For each entity: which reference-slice files to copy/rename, and what changes.
   If "items" is not needed, say so (it will be deleted).
3. API endpoints table (method, path, auth, request schema, response) following
   API_GUIDE. Prefer the standard CRUD + list query shape.
4. Pages/routes: public pages vs /app/* (protected) pages, and the nav entries for
   src/config/site.ts.
5. Optional modules needed (uploads, fetchJson integrations, admin role) and the env
   vars they need.
6. Anything the foundation does NOT cover that we must build, with the simplest approach.
7. Risks/unknowns.

Rules: no new dependencies or services unless clearly justified; keep the existing
contracts (AppError, envelope, apiHandler, apiFetch, useApiForm). Do not write
application code in this step, only docs/PRODUCT.md. Ask me before deviating from the
foundation's architecture.
```
