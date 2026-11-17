import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { capAnswer, MAX_ANSWER_CHARS, readLines } from "@/server/assistant/providers/http";
import { createGeminiProvider } from "@/server/assistant/providers/gemini";
import { createOllamaProvider } from "@/server/assistant/providers/ollama";
import { createOpenRouterProvider } from "@/server/assistant/providers/openrouter";
import type { AiProvider, GenerateRequest } from "@/server/assistant/providers/types";

/** A streaming Response whose body is delivered in the given raw chunks. */
function streamResponse(chunks: Array<string | Uint8Array>, status = 200) {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(typeof c === "string" ? enc.encode(c) : c);
      controller.close();
    },
  });
  return new Response(body, { status });
}

const request = (overrides: Partial<GenerateRequest> = {}): GenerateRequest => ({
  messages: [
    { role: "system", content: "You are helpful." },
    { role: "user", content: "Hi" },
  ],
  maxOutputTokens: 64,
  signal: new AbortController().signal,
  ...overrides,
});

async function collect(provider: AiProvider, req = request()) {
  let out = "";
  for await (const piece of provider.stream(req)) out += piece;
  return out;
}

let fetchMock: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  fetchMock = vi.spyOn(globalThis, "fetch");
});
afterEach(() => vi.restoreAllMocks());

const ollama = () =>
  createOllamaProvider({ baseUrl: "http://127.0.0.1:11434/", model: "qwen2.5:3b" });
const openrouter = (model = "meta/some-model:free", allowPaidModels = false) =>
  createOpenRouterProvider({
    apiKey: "sk-test",
    model,
    allowPaidModels,
    appUrl: "http://x",
    appName: "t",
  });
const gemini = () => createGeminiProvider({ apiKey: "g-test", model: "gemini-2.5-flash" });

describe("stream helpers", () => {
  it("readLines is UTF-8 safe when a Malayalam character is split across chunks", async () => {
    const bytes = new TextEncoder().encode("കുരുമുളക്\nok\n");
    const parts = [bytes.slice(0, 4), bytes.slice(4, 9), bytes.slice(9)];
    const lines: string[] = [];
    for await (const l of readLines(streamResponse(parts).body!, "ollama")) lines.push(l);
    expect(lines).toEqual(["കുരുമുളക്", "ok"]);
  });

  it("capAnswer truncates runaway output", async () => {
    async function* big() {
      for (let i = 0; i < 100; i++) yield "x".repeat(1000);
    }
    let total = 0;
    for await (const p of capAnswer(big(), "ollama")) total += p.length;
    expect(total).toBe(MAX_ANSWER_CHARS);
  });
});

describe("Ollama provider", () => {
  it("streams message content and sends model + options", async () => {
    fetchMock.mockResolvedValue(
      streamResponse([
        '{"message":{"content":"Hel"},"done":false}\n{"message":{"content":"lo"}',
        ',"done":false}\n{"message":{"content":""},"done":true}\n',
      ]),
    );
    expect(await collect(ollama())).toBe("Hello");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:11434/api/chat");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({ model: "qwen2.5:3b", stream: true, options: { num_predict: 64 } });
    expect(body.messages[0]).toEqual({ role: "system", content: "You are helpful." });
  });

  it("maps an in-stream error to bad_response", async () => {
    fetchMock.mockResolvedValue(streamResponse(['{"error":"model crashed"}\n']));
    await expect(collect(ollama())).rejects.toMatchObject({ kind: "bad_response" });
  });

  it("maps connection refused to unavailable", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(collect(ollama())).rejects.toMatchObject({
      kind: "unavailable",
      provider: "ollama",
    });
  });

  it("maps an abort/timeout to timeout", async () => {
    fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    await expect(collect(ollama())).rejects.toMatchObject({ kind: "timeout" });
  });

  it("maps HTTP 404 (model not found) to not_configured and 500 to unavailable", async () => {
    fetchMock.mockResolvedValueOnce(new Response("model not found", { status: 404 }));
    await expect(collect(ollama())).rejects.toMatchObject({ kind: "not_configured" });
    fetchMock.mockResolvedValueOnce(new Response("boom", { status: 500 }));
    await expect(collect(ollama())).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("rejects malformed JSON lines", async () => {
    fetchMock.mockResolvedValue(streamResponse(["not json\n"]));
    await expect(collect(ollama())).rejects.toMatchObject({ kind: "bad_response" });
  });

  it("health: ok when the model is pulled, helpful message when not", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ models: [{ name: "qwen2.5:3b" }] }));
    expect(await ollama().health()).toMatchObject({ ok: true, provider: "ollama" });
    fetchMock.mockResolvedValueOnce(Response.json({ models: [{ name: "llama3:latest" }] }));
    expect((await ollama().health()).detail).toContain("ollama pull qwen2.5:3b");
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect(await ollama().health()).toMatchObject({ ok: false });
  });
});

describe("OpenRouter provider", () => {
  it("streams SSE deltas, ignores comments and stops at [DONE]", async () => {
    fetchMock.mockResolvedValue(
      streamResponse([
        ": OPENROUTER PROCESSING\n\n",
        'data: {"choices":[{"delta":{"content":"Hi "}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"there"}}]}\n\ndata: [DONE]\n\n',
        'data: {"choices":[{"delta":{"content":"IGNORED"}}]}\n\n',
      ]),
    );
    expect(await collect(openrouter())).toBe("Hi there");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
    expect(JSON.parse(init.body as string)).toMatchObject({ stream: true, max_tokens: 64 });
  });

  it("refuses non-free models unless explicitly allowed (no silent billing)", async () => {
    await expect(collect(openrouter("openai/gpt-4o"))).rejects.toMatchObject({
      kind: "not_configured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValue(
      streamResponse(['data: {"choices":[{"delta":{"content":"ok"}}]}\n']),
    );
    expect(await collect(openrouter("openai/gpt-4o", true))).toBe("ok");
  });

  it("maps 429 → rate_limited, 402 → quota, 401 → auth", async () => {
    fetchMock.mockResolvedValueOnce(new Response("slow down", { status: 429 }));
    await expect(collect(openrouter())).rejects.toMatchObject({ kind: "rate_limited" });
    fetchMock.mockResolvedValueOnce(new Response("credits", { status: 402 }));
    await expect(collect(openrouter())).rejects.toMatchObject({ kind: "quota" });
    fetchMock.mockResolvedValueOnce(new Response("bad key", { status: 401 }));
    await expect(collect(openrouter())).rejects.toMatchObject({ kind: "auth" });
  });

  it("maps a mid-stream error object", async () => {
    fetchMock.mockResolvedValue(
      streamResponse(['data: {"error":{"code":429,"message":"limit"}}\n']),
    );
    await expect(collect(openrouter())).rejects.toMatchObject({ kind: "rate_limited" });
  });

  it("errors never contain the API key", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 401 }));
    const error = await collect(openrouter()).catch((e: Error) => e);
    expect(String((error as Error).message)).not.toContain("sk-test");
  });
});

describe("Gemini provider", () => {
  it("maps system → systemInstruction and assistant → model role", async () => {
    fetchMock.mockResolvedValue(
      streamResponse([
        'data: {"candidates":[{"content":{"parts":[{"text":"Nam"}]}}]}\n\n',
        'data: {"candidates":[{"content":{"parts":[{"text":"askaram"}]}}]}\n\n',
      ]),
    );
    const req = request({
      messages: [
        { role: "system", content: "Rules" },
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello" },
        { role: "user", content: "Again" },
      ],
    });
    expect(await collect(gemini(), req)).toBe("Namaskaram");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("gemini-2.5-flash:streamGenerateContent?alt=sse");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.systemInstruction.parts[0].text).toBe("Rules");
    expect(body.contents.map((c: { role: string }) => c.role)).toEqual(["user", "model", "user"]);
    expect((init as RequestInit).headers).toMatchObject({ "x-goog-api-key": "g-test" });
  });

  it("maps quota exhaustion (429) to rate_limited", async () => {
    fetchMock.mockResolvedValue(new Response("RESOURCE_EXHAUSTED", { status: 429 }));
    await expect(collect(gemini())).rejects.toMatchObject({ kind: "rate_limited" });
  });
});
