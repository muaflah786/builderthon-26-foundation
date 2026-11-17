# T3: Reference Resource "items" (CRUD + search/filter/sort/pagination) (wave 3)

**Branch:** `task/t3-items` (from `main` **after Integration A**) · **Read first:** `docs/tasks/_COMMON.md`

## Objective

Build one complete, owner-scoped vertical slice that the team will **copy and rename** for each entity in the competition. Quality of the pattern matters more than features. Every file starts with a comment `// REFERENCE SLICE: copy & rename (see docs/COMPETITION_ADAPTATION_GUIDE.md)`.

## You own

- `src/server/db/schema/items.ts`, `src/server/db/seeds/items.ts`, `src/server/db/query-helpers.ts`
- `src/server/services/items.ts`, `src/lib/validation/items.ts`
- `src/app/api/items/route.ts`, `src/app/api/items/[id]/route.ts`
- `src/app/app/items/**` (list page, `new/page.tsx`, `[id]/page.tsx` detail+edit)
- `src/components/items/**`
- `tests/e2e/items.spec.ts`, `docs/modules/t3-items.md`

## Must not modify

Anything else. To register the seeder in `src/server/db/seed.ts` and add the nav item in `src/config/site.ts`, put the exact lines under "Requests to coordinator".

## Dependencies allowed

None.

## Requirements

1. **Schema** per `docs/MODULE_CONTRACTS.md §Reference resource` + `DATABASE_GUIDE.md` (indexes on `owner_id`, `(owner_id, created_at)`, `status`).
2. **Validation**: `createItemSchema`, `updateItemSchema = createItemSchema.partial()` (reject empty object), `listItemsQuerySchema = listQuerySchema(["createdAt","updatedAt","title"]).extend({ status: z.enum(STATUSES).optional() })`.
3. **query-helpers.ts** (generic, reusable): `escapeLike(s)` (escapes `%`, `_`, `\`), `containsInsensitive(column, q)` (`LIKE ... ESCAPE '\'`), `orderByFrom(columns map, sort, order)`, `paginate(query, page, pageSize)`. Unit tested.
4. **Service** `items.ts` (server-only): `list(user, query)` → `{ rows, meta }` (search over title+description, status filter, sort, pagination; total count with the same filters); `getById(user, id)`; `create(user, input)`; `update(user, id, input)`; `remove(user, id)`. Owner scoping: non-admin users get only their own rows; others' rows → `AppError.notFound("Item")`. Admin sees all. Return DTOs (`ItemDto` with ISO date strings).
5. **API**: exactly per `docs/API_GUIDE.md` examples (`apiHandler`, `parseQuery/parseJson/parseParams`, `requireUser`, `paginated`, `created`, `noContent`). Update your rows in the API_GUIDE endpoint registry.
6. **Pages** under `/app/items` (inside the protected area): list page is a **server component** that reads `searchParams`, validates them with `listItemsQuerySchema` (on invalid params, fall back to defaults, never crash), calls the service directly, and renders: search box + status filter + sort select (a GET `<form>`, so URL state works without JS), `Table`, `Pagination`, `EmptyState` (distinct "no items yet" vs "no results for filters"). Create/edit forms are client components using `useApiForm` + `FormField` + shared schema → `apiFetch`, then `router.push`/`router.refresh()`. Delete uses a confirm `Dialog`, then a toast.
7. **Seed**: 25 items for a demo user (`demo@example.com` / password from seed constant; create the user through `auth.api.signUpEmail` if missing). Idempotent.

## Acceptance criteria

- [ ] Service tests with `tests/helpers/db.ts`: list (search escaping `%`/`_`, filter, sort, pagination meta), CRUD, **user B cannot read/update/delete user A's item (404)**, admin can.
- [ ] Route tests with `tests/helpers/auth.ts` + `request.ts`: 401 when signed out, 422 with fieldErrors on bad input, 201 on create, 204 on delete, invalid `sort` → 422.
- [ ] `tests/e2e/items.spec.ts`: sign up → create item → appears in list → search finds it → edit → delete.
- [ ] List page works with JS disabled for search/filter/pagination (manual check, described in report).
- [ ] `npm run check`, `npm run build`, `npm run test:e2e` pass.
