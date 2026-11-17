import {
  capAnswer,
  postForStream,
  readNdjson,
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
 * Ollama (local inference, free). Docs: https://github.com/ollama/ollama/blob/main/docs/api.md
 * NOTE: a model on your laptop serves only your laptop; a public deployment needs
 * a hosted provider (see docs/T6_PROVIDER_GUIDE.md).
 */
export function createOllamaProvider(config: { baseUrl: string; model: string }): AiProvider {
  const base = config.baseUrl.replace(/\/$/, "");

  async function* deltas(request: GenerateRequest): AsyncGenerator<string> {
    const body = await postForStream("ollama", `${base}/api/chat`, {
      headers: {},
      signal: request.signal,
      body: {
        model: config.model,
        messages: request.messages,
        stream: true,
        options: {
          num_predict: request.maxOutputTokens,
          temperature: request.temperature ?? 0.3,
        },
      },
    });
    for await (const event of readNdjson(body, "ollama")) {
      const e = event as { message?: { content?: unknown }; done?: boolean; error?: unknown };
      if (typeof e.error === "string") {
        throw new ProviderError("ollama", "bad_response", `ollama error: ${e.error.slice(0, 200)}`);
      }
      const text = e.message?.content;
      if (text !== undefined && typeof text !== "string") {
        throw new ProviderError("ollama", "bad_response", "ollama sent a non-text message");
      }
      if (text) yield text;
      if (e.done) return;
    }
  }

  return {
    id: "ollama",
    model: config.model,
    stream: (request) => capAnswer(deltas(request), "ollama"),
    async health(signal): Promise<ProviderHealth> {
      const fail = (detail: string): ProviderHealth => ({
        ok: false,
        provider: "ollama",
        model: config.model,
        detail,
      });
      try {
        const res = await fetch(`${base}/api/tags`, {
          signal: signal ?? AbortSignal.timeout(3000),
          cache: "no-store",
        });
        if (!res.ok) return fail(statusError("ollama", res.status).message);
        const json = (await res.json()) as { models?: Array<{ name?: string; model?: string }> };
        const names = (json.models ?? []).flatMap((m) => [m.name, m.model]).filter(Boolean);
        const wanted = config.model.includes(":") ? config.model : `${config.model}:latest`;
        if (!names.includes(config.model) && !names.includes(wanted)) {
          return fail(`Model "${config.model}" is not pulled. Run: ollama pull ${config.model}`);
        }
        return { ok: true, provider: "ollama", model: config.model, detail: "Ollama is running" };
      } catch (error) {
        const e = toTransportError("ollama", error);
        return fail(
          e.kind === "timeout"
            ? "Ollama did not answer in time"
            : `Ollama is not reachable at ${base}. Is it running?`,
        );
      }
    },
  };
}
