// Recreates ./e2e.db from the committed migrations before the E2E server starts.
// Run by playwright.config.ts (webServer.command); DATABASE_URL comes from its env.
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

const url = process.env.DATABASE_URL ?? "file:./e2e.db";
if (!url.startsWith("file:") || url.includes("local.db")) {
  throw new Error(`Refusing to reset a non-E2E database: ${url}`);
}
const file = url.slice("file:".length);
for (const suffix of ["", "-journal", "-wal", "-shm"]) rmSync(file + suffix, { force: true });

execSync("npx drizzle-kit migrate", { stdio: "inherit", env: process.env });
console.log(`✓ E2E database ready (${file})`);
