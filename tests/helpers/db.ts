/// <reference types="vite/client" />
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from "drizzle-kit/api";
import { libsqlClient } from "@/server/db/client";

/**
 * Isolated test database helpers.
 *
 * Vitest sets DATABASE_URL=file::memory: (vitest.config.mts). `libsqlClient` is a
 * singleton per test worker, and each test FILE runs in its own worker module
 * graph, so every test file gets its own empty in-memory database.
 *
 *   beforeAll(() => setupTestDb());        // create every table in src/server/db/schema/*
 *   beforeEach(() => resetTestDb());       // delete all rows between tests
 *
 * The schema is built straight from the Drizzle table definitions (no committed
 * migrations needed), so it also works on task branches.
 */

type SchemaModule = Record<string, unknown>;

// Every schema module, discovered at build time by Vite.
const schemaModules = import.meta.glob<SchemaModule>("/src/server/db/schema/*.ts", {
  eager: true,
});

function allSchemaExports(extra?: SchemaModule): SchemaModule {
  return Object.assign({}, ...Object.values(schemaModules), extra ?? {});
}

async function userTables(): Promise<string[]> {
  const result = await libsqlClient.execute(
    "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%'",
  );
  return result.rows.map((row) => String(row.name));
}

/**
 * Drops all tables, then creates every table from src/server/db/schema/*.ts plus
 * any `extra` tables (e.g. a throwaway table defined inside a test file).
 */
export async function setupTestDb(extra?: SchemaModule): Promise<void> {
  await libsqlClient.execute("PRAGMA foreign_keys = OFF");
  for (const name of await userTables()) {
    await libsqlClient.execute(`DROP TABLE IF EXISTS "${name}"`);
  }
  await libsqlClient.execute("PRAGMA foreign_keys = ON");

  const empty = await generateSQLiteDrizzleJson({});
  const current = await generateSQLiteDrizzleJson(allSchemaExports(extra));
  for (const statement of await generateSQLiteMigration(empty, current)) {
    await libsqlClient.execute(statement);
  }
}

/** Deletes every row from every table (keeps the schema). */
export async function resetTestDb(): Promise<void> {
  await libsqlClient.execute("PRAGMA foreign_keys = OFF");
  for (const name of await userTables()) {
    await libsqlClient.execute(`DELETE FROM "${name}"`);
  }
  await libsqlClient.execute("PRAGMA foreign_keys = ON");
}

/** Table names currently in the test DB (useful for assertions). */
export const listTestTables = userTables;
