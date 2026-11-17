import "server-only";

import { env } from "@/lib/env";
import { createGeminiProvider } from "@/server/assistant/providers/gemini";
import { createOllamaProvider } from "@/server/assistant/providers/ollama";
import { createOpenRouterProvider } from "@/server/assistant/providers/openrouter";
import type { AiProvider, ProviderId } from "@/server/assistant/providers/types";

export type ProviderResolution =
  { status: "ready"; provider: AiProvider } | { status: "not_configured"; reason: string };

/**
 * Resolves the configured provider from env. Exactly one provider is active
 * (AI_PROVIDER); there is deliberately NO automatic fallback to another
 * provider, so a request can never silently move to a different (possibly paid)
 * service. `preferred` (from a site config) must match AI_PROVIDER.
 */
export function resolveProvider(preferred?: ProviderId): ProviderResolution {
  const id = env.AI_PROVIDER;
  if (!id) {
    return {
      status: "not_configured",
      reason:
        "No AI provider configured. Set AI_PROVIDER=ollama (free, local) in .env.local and run `ollama pull qwen2.5:3b`. See docs/T6_PROVIDER_GUIDE.md.",
    };
  }
  if (preferred && preferred !== id) {
    return {
      status: "not_configured",
      reason: `This site prefers provider "${preferred}" but AI_PROVIDER is "${id}".`,
    };
  }
  switch (id) {
    case "ollama":
      return {
        status: "ready",
        provider: createOllamaProvider({ baseUrl: env.OLLAMA_BASE_URL, model: env.OLLAMA_MODEL }),
      };
    case "openrouter":
      if (!env.OPENROUTER_API_KEY || !env.OPENROUTER_MODEL) {
        return {
          status: "not_configured",
          reason:
            "AI_PROVIDER=openrouter needs OPENROUTER_API_KEY and OPENROUTER_MODEL (a :free model).",
        };
      }
      return {
        status: "ready",
        provider: createOpenRouterProvider({
          apiKey: env.OPENROUTER_API_KEY,
          model: env.OPENROUTER_MODEL,
          allowPaidModels: env.OPENROUTER_ALLOW_PAID_MODELS === "true",
          appUrl: env.APP_URL,
          appName: "Builderthon Website Assistant",
        }),
      };
    case "gemini":
      if (!env.GEMINI_API_KEY) {
        return { status: "not_configured", reason: "AI_PROVIDER=gemini needs GEMINI_API_KEY." };
      }
      return {
        status: "ready",
        provider: createGeminiProvider({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL }),
      };
  }
}

export type { AiProvider, ProviderId } from "@/server/assistant/providers/types";
export { ProviderError } from "@/server/assistant/providers/types";
