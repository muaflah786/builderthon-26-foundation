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
 * Google Gemini API (hosted). A free tier exists for some models with strict
 * per-minute/per-day quotas; on the free tier Google may use prompts to improve
 * its products. See docs/T6_PROVIDER_GUIDE.md.
 */
export function createGeminiProvider(config: { apiKey: string; model: string }): AiProvider {
  const base = "https://generativelanguage.googleapis.com/v1beta";
  const model = encodeURIComponent(config.model);

  async function* deltas(request: GenerateRequest): AsyncGenerator<string> {
    const system = request.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const contents = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const body = await postForStream(
      "gemini",
      `${base}/models/${model}:streamGenerateContent?alt=sse`,
      {
        headers: { "x-goog-api-key": config.apiKey },
        signal: request.signal,
        body: {
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          contents,
          generationConfig: {
            maxOutputTokens: request.maxOutputTokens,
            temperature: request.temperature ?? 0.3,
          },
        },
      },
    );
    for await (const event of readSseJson(body, "gemini")) {
      const e = event as {
        error?: { code?: number; message?: string };
        candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
      };
      if (e.error) throw statusError("gemini", Number(e.error.code) || 502, e.error.message ?? "");
      for (const part of e.candidates?.[0]?.content?.parts ?? []) {
        if (part.text !== undefined && typeof part.text !== "string") {
          throw new ProviderError("gemini", "bad_response", "gemini sent a non-text part");
        }
        if (part.text) yield part.text;
      }
    }
  }

  return {
    id: "gemini",
    model: config.model,
    stream: (request) => capAnswer(deltas(request), "gemini"),
    async health(signal): Promise<ProviderHealth> {
      const base_ = { provider: "gemini" as const, model: config.model };
      try {
        // Model metadata lookup: validates key + model without inference.
        const res = await fetch(`${base}/models/${model}`, {
          headers: { "x-goog-api-key": config.apiKey },
          signal: signal ?? AbortSignal.timeout(5000),
          cache: "no-store",
        });
        if (!res.ok)
          return { ...base_, ok: false, detail: statusError("gemini", res.status).message };
        return { ...base_, ok: true, detail: "API key and model accepted" };
      } catch (error) {
        return { ...base_, ok: false, detail: toTransportError("gemini", error).message };
      }
    },
  };
}
