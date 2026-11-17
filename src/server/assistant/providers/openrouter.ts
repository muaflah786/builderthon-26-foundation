import {
  capAnswer,
  postForStream,
  readSseJson,
  statusError,
  toTransportError,
} from "@/server/assistant/providers/http";
import {
  ProviderError,
  type AiProvider,
  type GenerateRequest,
  type ProviderHealth,
} from "@/server/assistant/providers/types";

/**
 * OpenRouter (hosted, OpenAI-compatible). Free models have ids ending in ":free";
 * which models are free changes over time, so the model is always configured.
 * Paid models are refused unless explicitly allowed (no silent billing).
 */
export function createOpenRouterProvider(config: {
  apiKey: string;
  model: string;
  allowPaidModels: boolean;
  appUrl: string;
  appName: string;
}): AiProvider {
  const base = "https://openrouter.ai/api/v1";
  const isFree = config.model.endsWith(":free");

  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    "HTTP-Referer": config.appUrl,
    "X-Title": config.appName,
  };

  function assertModelAllowed() {
    if (!isFree && !config.allowPaidModels) {
      throw new ProviderError(
        "openrouter",
        "not_configured",
        `OPENROUTER_MODEL "${config.model}" is not a ":free" model; refusing to incur charges`,
      );
    }
  }

  async function* deltas(request: GenerateRequest): AsyncGenerator<string> {
    assertModelAllowed();
    const body = await postForStream("openrouter", `${base}/chat/completions`, {
      headers,
      signal: request.signal,
      body: {
        model: config.model,
        messages: request.messages,
        stream: true,
        max_tokens: request.maxOutputTokens,
        temperature: request.temperature ?? 0.3,
      },
    });
    for await (const event of readSseJson(body, "openrouter")) {
      const e = event as {
        error?: { message?: string; code?: number };
        choices?: Array<{ delta?: { content?: unknown }; finish_reason?: string | null }>;
      };
      if (e.error) {
        throw statusError("openrouter", Number(e.error.code) || 502, e.error.message ?? "");
      }
      const text = e.choices?.[0]?.delta?.content;
      if (text !== undefined && text !== null && typeof text !== "string") {
        throw new ProviderError("openrouter", "bad_response", "openrouter sent a non-text delta");
      }
      if (text) yield text;
    }
  }

  return {
    id: "openrouter",
    model: config.model,
    stream: (request) => capAnswer(deltas(request), "openrouter"),
    async health(signal): Promise<ProviderHealth> {
      const base_ = { provider: "openrouter" as const, model: config.model };
      if (!isFree && !config.allowPaidModels) {
        return { ...base_, ok: false, detail: "Model is not a :free model (paid models disabled)" };
      }
      try {
        // Validates the key without running (or paying for) any inference.
        const res = await fetch(`${base}/key`, {
          headers: { Authorization: headers.Authorization },
          signal: signal ?? AbortSignal.timeout(5000),
          cache: "no-store",
        });
        if (!res.ok)
          return { ...base_, ok: false, detail: statusError("openrouter", res.status).message };
        return { ...base_, ok: true, detail: "API key accepted" };
      } catch (error) {
        return { ...base_, ok: false, detail: toTransportError("openrouter", error).message };
      }
    },
  };
}
