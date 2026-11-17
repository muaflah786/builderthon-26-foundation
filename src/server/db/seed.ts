/**
 * Development seed script: `npm run db:seed`.
 * Runs outside Next.js, so it imports the raw client (not "@/server/db").
 *
 * To add seed data: write a function `async function seedThings(db: Db)` in
 * src/server/db/seeds/<resource>.ts and add it to the `seeders` array below.
 * Seeders must be idempotent (safe to run twice).
 */
import { sql } from "drizzle-orm";
import { db, libsqlClient, type Db } from "./client";

type Seeder = { name: string; run: (db: Db) => Promise<void> };

const seeders: Seeder[] = [
  // { name: "things", run: seedThings },
];

async function main() {
  await db.run(sql`select 1`);
  console.log("✓ Database reachable");

  if (seeders.length === 0) {
    console.log("No seeders registered yet (see src/server/db/seed.ts).");
  }
  for (const seeder of seeders) {
    await seeder.run(db);
    console.log(`✓ Seeded ${seeder.name}`);
  }
}

main()
  .catch((error) => {
    console.error("✗ Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => libsqlClient.close());
