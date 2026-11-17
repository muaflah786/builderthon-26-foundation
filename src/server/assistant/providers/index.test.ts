import { afterEach, describe, expect, it, vi } from "vitest";

/** Loads resolveProvider with a specific env (env.ts is parsed at import time). */
async function withEnv(vars: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v as string);
  return import("@/server/assistant/providers");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("resolveProvider", () => {
  it("is not_configured without AI_PROVIDER, with setup guidance", async () => {
    const { resolveProvider } = await withEnv({ AI_PROVIDER: "" });
    const r = resolveProvider();
    expect(r.status).toBe("not_configured");
    expect(r.status === "not_configured" && r.reason).toContain("AI_PROVIDER=ollama");
  });

  it("returns the Ollama provider with the configured model", async () => {
    const { resolveProvider } = await withEnv({
      AI_PROVIDER: "ollama",
      OLLAMA_MODEL: "llama3.2:3b",
    });
    const r = resolveProvider();
    expect(r.status === "ready" && [r.provider.id, r.provider.model]).toEqual([
      "ollama",
      "llama3.2:3b",
    ]);
  });

  it("requires a key and model for OpenRouter, a key for Gemini", async () => {
    let mod = await withEnv({ AI_PROVIDER: "openrouter", OPENROUTER_API_KEY: "k" });
    expect(mod.resolveProvider().status).toBe("not_configured");
    mod = await withEnv({
      AI_PROVIDER: "openrouter",
      OPENROUTER_API_KEY: "k",
      OPENROUTER_MODEL: "x/y:free",
    });
    expect(mod.resolveProvider().status).toBe("ready");
    mod = await withEnv({ AI_PROVIDER: "gemini" });
    expect(mod.resolveProvider().status).toBe("not_configured");
  });

  it("never switches provider: a site preferring another provider is not_configured", async () => {
    const { resolveProvider } = await withEnv({ AI_PROVIDER: "ollama" });
    expect(resolveProvider("gemini").status).toBe("not_configured");
    expect(resolveProvider("ollama").status).toBe("ready");
  });
});
