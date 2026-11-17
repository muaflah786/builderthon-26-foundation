# Database Guide

**Engine:** SQLite via libSQL. Locally it is the file `./local.db` (git-ignored, created automatically). In production it is Turso (`libsql://...`). **ORM:** Drizzle (`drizzle-orm/libsql`, `drizzle-orm/sqlite-core`).

## Conventions

| Rule                                                                                                     | Example                                               |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| One schema file per module: `src/server/db/schema/<module>.ts`. drizzle-kit picks up every file there.   | `schema/items.ts`                                     |
| Table names: plural snake_case. Column names: snake_case, mapped to camelCase TS keys **explicitly**.    | `text("owner_id")` → `ownerId`                        |
| Primary key: `idColumn()` (text UUID). Never expose autoincrement ints.                                  | `id: idColumn()`                                      |
| Timestamps: spread `...timestamps()` (unix ms, exposed as `Date`).                                       | `createdAt`, `updatedAt`                              |
| Booleans: `integer("is_done", { mode: "boolean" })`. Enums: `text("status", { enum: ["open","done"] })`. |                                                       |
| Foreign keys always declare `onDelete`.                                                                  | `.references(() => user.id, { onDelete: "cascade" })` |
| Index every column used in `WHERE`/`ORDER BY` on list pages.                                             | `index("items_owner_idx").on(t.ownerId)`              |
| Export inferred types next to the table.                                                                 | `export type Item = typeof items.$inferSelect`        |

The Drizzle instance is created **without** a schema registry. Use the SQL-like builder (`db.select().from(items).where(...)`), not `db.query.items.findMany`. This keeps schema files independent of each other.

Exception: the Better Auth tables (`user`, `session`, `account`, `verification`) are **singular**, because the auth adapter looks them up by those names. Reference users as `user.id` from `@/server/db/schema/auth`.

Generic list helpers live in `src/server/db/query-helpers.ts`: `containsInsensitive` (escaped `LIKE`), `orderByFrom` (allow-listed sort) and `pageWindow`.

## Commands

```bash
npm run db:push       # DEV ONLY: sync local.db to the schema instantly (no migration file)
npm run db:generate   # create a SQL migration in ./drizzle from schema changes
npm run db:migrate    # apply pending migrations (use this in production)
npm run db:studio     # browse data in the browser
npm run db:seed       # demo user (demo@example.com / demo-password-123) + demo items; idempotent
```

## Workflow rules (important for parallel work)

1. **On task branches:** change your own schema file and run `npm run db:push`. **Do not commit anything in `drizzle/`.**
2. **Coordinator, after merging:** run `npm run db:generate` once, review the SQL, and commit it. This gives one linear migration history with no numbering conflicts.
3. **During the competition** (one shared branch): whoever changes the schema runs `db:generate` and commits the migration in the same commit as the schema change. Announce it to the team.
4. **Never drop one table and create another in the same `db:generate`.** drizzle-kit then asks interactively whether it is a rename, and crashes in non-interactive shells (Claude, CI). Generate the drop first, then the new tables.
5. `db:push` asks for confirmation (strict mode). Run it only in a real terminal.
6. If `local.db` gets into a bad state: delete it, then run `npm run db:migrate && npm run db:seed`.

## Seeding

Add `src/server/db/seeds/<resource>.ts` exporting `async (db: Db) => {...}`. Make it idempotent (`onConflictDoNothing()`), then register it in `src/server/db/seed.ts`.

## Using the DB in code

```ts
import { db } from "@/server/db"; // app code (server-only)
import { and, desc, eq, like, count } from "drizzle-orm";
const rows = await db
  .select()
  .from(items)
  .where(eq(items.ownerId, user.id))
  .orderBy(desc(items.createdAt));
```

Tests get an isolated in-memory DB (`DATABASE_URL=file::memory:` in vitest config). Use `tests/helpers/db.ts` (`setupTestDb`/`resetTestDb`) to create the schema in it.
