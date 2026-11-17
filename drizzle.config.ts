import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Same precedence as Next.js: .env.local overrides .env
config({ path: [".env.local", ".env"], quiet: true });

const url = process.env.DATABASE_URL ?? "file:./local.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

export default defineConfig({
  // Every file in this folder is a schema module; each module owns its own tables.
  schema: "./src/server/db/schema/*.ts",
  out: "./drizzle",
  // "turso" = the libSQL driver; it handles local file: URLs and remote libsql:// URLs.
  dialect: "turso",
  dbCredentials: authToken ? { url, authToken } : { url },
  strict: true,
  verbose: true,
});
