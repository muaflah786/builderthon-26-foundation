import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against a real production build on port 3100 with an isolated
 * SQLite file (./e2e.db), recreated from the committed migrations on every run.
 *
 *   npx playwright install chromium   # once per machine
 *   npm run test:e2e
 *
 * Note: this runs `next build`, which rewrites .next/ — stop `npm run dev` in the
 * same folder first.
 */

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node tests/e2e/prepare-db.mjs && npm run build && npx next start -p ${PORT}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: "pipe",
    env: {
      DATABASE_URL: "file:./e2e.db",
      APP_URL: baseURL,
      // Test-only value (not a real secret); production rejects known placeholders.
      BETTER_AUTH_SECRET: "e2e-only-secret-not-used-anywhere-else-0123456789",
      // E2E signs up many users from one IP; the rate limiter is unit-tested instead.
      AUTH_RATE_LIMIT: "off",
      // No AI provider in E2E (overrides any AI_PROVIDER in .env.local): UI tests script the stream.
      AI_PROVIDER: "",
      NEXT_PUBLIC_APP_NAME: "ORDOX",
    },
  },
});
