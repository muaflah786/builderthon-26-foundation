# API Guide

All JSON APIs live under `src/app/api/**/route.ts`. `/api/auth/*` is the exception: Better Auth owns it and uses its own format.

## Response envelope (fixed contract)

Types: `src/lib/api/types.ts`.

```jsonc
// success
{ "ok": true, "data": { ... } }
// success, paginated list
{ "ok": true, "data": [ ... ], "meta": { "page": 1, "pageSize": 20, "total": 57, "totalPages": 3 } }
// failure
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed",
  "fieldErrors": { "title": ["Too short"] } } }
```

| `error.code`        | HTTP | When                                                                  |
| ------------------- | ---- | --------------------------------------------------------------------- |
| `BAD_REQUEST`       | 400  | malformed JSON, wrong content type                                    |
| `UNAUTHENTICATED`   | 401  | not signed in                                                         |
| `FORBIDDEN`         | 403  | signed in but not allowed                                             |
| `NOT_FOUND`         | 404  | missing, **or not owned by the caller** (do not reveal existence)     |
| `CONFLICT`          | 409  | unique constraint, state conflict                                     |
| `PAYLOAD_TOO_LARGE` | 413  | body > 1 MB                                                           |
| `VALIDATION_ERROR`  | 422  | Zod failure; includes `fieldErrors`                                   |
| `RATE_LIMITED`      | 429  | too many requests                                                     |
| `INTERNAL_ERROR`    | 500  | anything unexpected; details are logged on the server, never returned |

`DELETE` returns **204** with no body. `POST` that creates returns **201**.

## Writing a route handler

```ts
// src/app/api/things/route.ts
import { apiHandler, created, paginated, parseJson, parseQuery } from "@/lib/api/server";
import { requireUser } from "@/server/auth/session";
import { createThingSchema, listThingsQuerySchema } from "@/lib/validation/things";
import * as things from "@/server/services/things";

export const GET = apiHandler(async (req) => {
  const user = await requireUser();
  const query = await parseQuery(req, listThingsQuerySchema);
  const { rows, meta } = await things.list(user, query);
  return paginated(rows, meta);
});

export const POST = apiHandler(async (req) => {
  const user = await requireUser();
  const input = await parseJson(req, createThingSchema);
  return created(await things.create(user, input));
});
```

```ts
// src/app/api/things/[id]/route.ts
export const GET = apiHandler(async (_req, ctx: RouteContext<"/api/things/[id]">) => {
  const user = await requireUser();
  const { id } = await parseParams(ctx.params, idParamSchema);
  return ok(await things.getById(user, id));
});
```

Rules:

- Always wrap handlers in `apiHandler`. Always validate input with `parseJson` / `parseQuery` / `parseParams`.
- Throw `AppError.*` for expected failures. Never `return Response.json({error})` by hand.
- Never return raw DB rows that contain secrets (password hashes, tokens). Services return DTOs.
- Use `PATCH` for partial updates (schema = `createSchema.partial()`).

## List query convention

`GET /api/<resource>?page=1&pageSize=20&q=text&sort=createdAt&order=desc&<filter>=value`

Build it with `listQuerySchema(["createdAt", "title"]).extend({ status: z.enum([...]).optional() })`. `sort` is an allow-list, so users can never sort by arbitrary columns. `pageSize` is capped at 100.

## Calling the API from the browser

```ts
import { apiFetch, apiFetchPage, ApiClientError } from "@/lib/api/client";

const thing = await apiFetch<Thing>("/api/things", { method: "POST", body: values });
const { data, meta } = await apiFetchPage<Thing>("/api/things", { query: { page, q } });
// on failure: catch (e) { if (e instanceof ApiClientError) e.fieldErrors?.title }
```

Server components do **not** call `/api/*` over HTTP. They call the service functions directly.

## Endpoint registry

Keep this table current; it is how the frontend knows what exists.

| Method           | Path              | Auth        | Module                | Status      |
| ---------------- | ----------------- | ----------- | --------------------- | ----------- |
| GET              | `/api/health`     | public      | Core                  | ✅ verified |
| *                | `/api/auth/*`     | public      | T1 Auth (Better Auth) | ✅ verified |
| GET/POST         | `/api/items`      | user        | T3 Reference resource | ⏳ pending  |
| GET/PATCH/DELETE | `/api/items/[id]` | owner/admin | T3                    | ⏳ pending  |
