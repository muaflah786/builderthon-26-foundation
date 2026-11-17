import type { ChatStreamEvent } from "@/lib/assistant/types";

const EVENT_TYPES = new Set(["meta", "delta", "done", "error"]);

/** Parses an NDJSON response body into chat stream events (UTF-8 safe across chunks). */
export async function* readChatStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ChatStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  const parse = (line: string): ChatStreamEvent | null => {
    try {
      const value = JSON.parse(line) as ChatStreamEvent;
      return value && EVENT_TYPES.has(value.type) ? value : null;
    } catch {
      return null;
    }
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let i = buffer.indexOf("\n");
      while (i >= 0) {
        const line = buffer.slice(0, i).trim();
        buffer = buffer.slice(i + 1);
        const event = line ? parse(line) : null;
        if (event) yield event;
        i = buffer.indexOf("\n");
      }
    }
    const rest = (buffer + decoder.decode()).trim();
    const last = rest ? parse(rest) : null;
    if (last) yield last;
  } finally {
    reader.releaseLock();
  }
}
