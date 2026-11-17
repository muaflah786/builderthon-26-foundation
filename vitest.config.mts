import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": r("./src"),
      // "server-only" throws outside the React server runtime; tests run in plain Node.
      "server-only": r("./tests/stubs/server-only.ts"),
    },
  },
  test: {
    // Node by default; component tests opt in with `// @vitest-environment jsdom` on line 1.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    setupFiles: ["./tests/setup.ts"],
    env: {
      // Isolated in-memory database for every test worker — never touches local.db.
      DATABASE_URL: "file::memory:",
    },
  },
});
