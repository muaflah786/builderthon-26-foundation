import { ProviderError, type ProviderId } from "@/server/assistant/providers/types";

/** Hard cap on characters a single answer may stream (protects against runaway output). */
export const MAX_ANSWER_CHARS = 16_000;

/**
 * POST JSON and return the streaming response, mapping transport failures and
 * HTTP status codes to ProviderError kinds. Never includes request bodies or
 * credentials in error messages.
 */
export async function postForStream(
  provider: ProviderId,
  url: string,
  init: { headers: Record<string, string>; body: unknown; signal: AbortSignal },
): Promise<ReadableStream<Uint8Array>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...init.headers },
      body: JSON.stringify(init.body),
      signal: init.signal,
      cache: "no-store",
    });
  } catch (error) {
    throw toTransportError(provider, error);
  }
  if (!res.ok || !res.body) {
    const detail = await safeErrorText(res);
    throw statusError(provider, res.status, detail);
  }
  return res.body;
}

export function toTransportError(provider: ProviderId, error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  const name = (error as { name?: string })?.name;
  if (name === "TimeoutError" || name === "AbortError") {
    return new ProviderError(provider, "timeout", `${provider} request timed out or was aborted`);
  }
  return new ProviderError(provider, "unavailable", `${provider} is unreachable`);
}

export function statusError(provider: ProviderId, status: number, detail = ""): ProviderError {
  const msg = `${provider} responded ${status}${detail ? `: ${detail}` : ""}`;
  if (status === 401 || status === 403) return new ProviderError(provider, "auth", msg, status);
  if (status === 402) return new ProviderError(provider, "quota", msg, status);
  if (status === 429) return new ProviderError(provider, "rate_limited", msg, status);
  if (status === 404) return new ProviderError(provider, "not_configured", msg, status);
  if (status >= 500) return new ProviderError(provider, "unavailable", msg, status);
  return new ProviderError(provider, "bad_response", msg, status);
}

/** First 200 chars of an error body, for server logs only. */
async function safeErrorText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 200).replace(/\s+/g, " ");
  } catch {
    return "";
  }
}

/** Splits a byte stream into text lines. UTF-8 safe across chunk boundaries (Malayalam etc.). */
export async function* readLines(
  stream: ReadableStream<Uint8Array>,
  provider: ProviderId,
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  try {
    while (true) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (error) {
        throw toTransportError(provider, error);
      }
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (line.length) yield line;
        newline = buffer.indexOf("\n");
      }
    }
    buffer += decoder.decode();
    if (buffer.trim().length) yield buffer.replace(/\r$/, "");
  } finally {
    reader.releaseLock();
  }
}

/** Yields the JSON payload of each Server-Sent Events `data:` line; stops at `[DONE]`. */
export async function* readSseJson(
  stream: ReadableStream<Uint8Array>,
  provider: ProviderId,
): AsyncGenerator<unknown> {
  for await (const line of readLines(stream, provider)) {
    if (!line.startsWith("data:")) continue; // comments (": keep-alive"), event names, ids
    const data = line.slice(5).trim();
    if (!data) continue;
    if (data === "[DONE]") return;
    yield parseJson(data, provider);
  }
}

/** Yields each newline-delimited JSON object. */
export async function* readNdjson(
  stream: ReadableStream<Uint8Array>,
  provider: ProviderId,
): AsyncGenerator<unknown> {
  for await (const line of readLines(stream, provider)) {
    yield parseJson(line, provider);
  }
}

function parseJson(data: string, provider: ProviderId): unknown {
  try {
    return JSON.parse(data);
  } catch {
    throw new ProviderError(provider, "bad_response", `${provider} sent malformed JSON`);
  }
}

/** Enforces the answer-length cap while passing text through. */
export async function* capAnswer(
  source: AsyncIterable<string>,
  provider: ProviderId,
): AsyncGenerator<string> {
  let total = 0;
  for await (const piece of source) {
    if (typeof piece !== "string") {
      throw new ProviderError(provider, "bad_response", `${provider} sent a non-text delta`);
    }
    if (!piece) continue;
    total += piece.length;
    if (total > MAX_ANSWER_CHARS) {
      yield piece.slice(0, Math.max(0, MAX_ANSWER_CHARS - (total - piece.length)));
      return;
    }
    yield piece;
  }
}
