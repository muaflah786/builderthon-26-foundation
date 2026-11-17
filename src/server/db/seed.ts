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
import { DEMO_USER, seedDemoUser } from "./seeds/demo-user";
import { seedItems } from "./seeds/items";

type Seeder = { name: string; run: (db: Db) => Promise<void> };

const seeders: Seeder[] = [
  { name: "demo user", run: seedDemoUser },
  { name: "items", run: seedItems },
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
  console.log(`Demo login: ${DEMO_USER.email} / ${DEMO_USER.password}`);
}

main()
  .catch((error) => {
    console.error("✗ Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => libsqlClient.close());
