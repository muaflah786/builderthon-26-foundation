"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ASSISTANT_LIMITS } from "@/lib/assistant/limits";
import type {
  AssistantClientConfig,
  ChatMessage,
  PageContext,
  SourceRef,
} from "@/lib/assistant/types";
import { readChatStream } from "@/components/assistant/stream";

export type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "streaming" | "done" | "error";
  sources?: SourceRef[];
};

export type ChatError = { code: string; message: string };

const storageKey = (siteId: string) => `assistant:conversation:${siteId}`;
let counter = 0;
const newId = () => `m${Date.now().toString(36)}${(counter++).toString(36)}`;

function loadStored(siteId: string): UiMessage[] {
  try {
    const raw = sessionStorage.getItem(storageKey(siteId));
    const parsed = raw ? (JSON.parse(raw) as UiMessage[]) : [];
    return Array.isArray(parsed)
      ? parsed.filter(
          (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
        )
      : [];
  } catch {
    return [];
  }
}

/** History sent to the server: finished turns only, newest last, within limits. */
export function toHistory(messages: UiMessage[]): ChatMessage[] {
  return messages
    .filter((m) => m.status === "done" && m.content.trim())
    .slice(-ASSISTANT_LIMITS.maxHistoryMessages)
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, ASSISTANT_LIMITS.maxAssistantMessageChars),
    }));
}

export function useAssistantChat(
  config: AssistantClientConfig,
  getPage: () => PageContext | undefined,
) {
  const endpoint = config.endpoint ?? "/api/assistant/chat";
  const persist = config.persistConversation !== false;
  // Restore this tab's conversation (sessionStorage: per tab, cleared when the tab closes).
  // On the server sessionStorage doesn't exist and loadStored() returns [] (the
  // panel starts closed, so server and client markup still match).
  const [messages, setMessages] = useState<UiMessage[]>(() =>
    persist ? loadStored(config.siteId) : [],
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastQuestion = useRef<string | null>(null);
  const messagesRef = useRef<UiMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!persist) return;
    try {
      const done = messages.filter((m) => m.status === "done");
      if (done.length) {
        sessionStorage.setItem(storageKey(config.siteId), JSON.stringify(done.slice(-30)));
      } else {
        sessionStorage.removeItem(storageKey(config.siteId));
      }
    } catch {
      /* storage unavailable (private mode): conversation simply isn't persisted */
    }
  }, [messages, config.siteId, persist]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const update = (id: string, patch: (m: UiMessage) => UiMessage) =>
    setMessages((list) => list.map((m) => (m.id === id ? patch(m) : m)));

  const ask = useCallback(
    async (rawText: string, history: ChatMessage[]) => {
      const text = rawText.trim().slice(0, ASSISTANT_LIMITS.maxMessageChars);
      if (!text) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      lastQuestion.current = text;
      setError(null);
      setPending(true);

      const assistantId = newId();
      setMessages((list) => [
        ...list,
        { id: newId(), role: "user", content: text, status: "done" },
        { id: assistantId, role: "assistant", content: "", status: "streaming" },
      ]);

      const fail = (e: ChatError) => {
        setError(e);
        update(assistantId, (m) => ({ ...m, status: "error" }));
      };

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
          body: JSON.stringify({
            siteId: config.siteId,
            message: text,
            history,
            page: config.pageContext === false ? undefined : getPage(),
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          let message = "The assistant is unavailable right now. Please try again.";
          let code = "HTTP_" + res.status;
          try {
            const json = await res.json();
            if (json?.error?.message) message = json.error.message;
            if (json?.error?.code) code = json.error.code;
          } catch {
            /* non-JSON error */
          }
          return fail({ code, message });
        }
        let gotText = false;
        for await (const event of readChatStream(res.body)) {
          if (event.type === "meta") {
            update(assistantId, (m) => ({ ...m, sources: event.sources }));
          } else if (event.type === "delta") {
            gotText = true;
            update(assistantId, (m) => ({ ...m, content: m.content + event.text }));
          } else if (event.type === "error") {
            return fail({ code: event.code, message: event.message });
          } else if (event.type === "done") {
            update(assistantId, (m) => ({ ...m, status: "done" }));
            return;
          }
        }
        // Stream ended without "done" (connection dropped).
        if (gotText) update(assistantId, (m) => ({ ...m, status: "done" }));
        else fail({ code: "INCOMPLETE", message: "The answer was interrupted. Please try again." });
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          // Stopped by the visitor (or reset): keep any partial answer, drop an empty one.
          setMessages((list) => {
            const answer = list.find((m) => m.id === assistantId);
            if (!answer) return list; // conversation was reset
            if (answer.content.trim()) {
              return list.map((m) =>
                m.id === assistantId ? { ...m, status: "done" as const } : m,
              );
            }
            // No answer yet: remove the empty reply and its unanswered question.
            const at = list.findIndex((m) => m.id === assistantId);
            return list.filter((_, i) => i !== at && i !== at - 1);
          });
          return;
        }
        fail({
          code: "NETWORK_ERROR",
          message: "Could not reach the assistant. Check your connection.",
        });
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setPending(false);
        }
      }
    },
    [config.siteId, config.pageContext, endpoint, getPage],
  );

  const send = useCallback(
    (text: string) => {
      if (pending) return;
      void ask(text, toHistory(messagesRef.current));
    },
    [ask, pending],
  );

  /** Re-asks the last question, discarding the failed answer. */
  const retry = useCallback(() => {
    const question = lastQuestion.current;
    if (!question || pending) return;
    const list = messagesRef.current;
    // Drop the failed assistant reply and the question it belonged to.
    const lastUser = list.map((m) => m.role).lastIndexOf("user");
    const kept = lastUser >= 0 ? list.slice(0, lastUser) : list;
    setMessages(kept);
    void ask(question, toHistory(kept));
  }, [ask, pending]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setPending(false);
    lastQuestion.current = null;
    try {
      sessionStorage.removeItem(storageKey(config.siteId));
    } catch {
      /* ignore */
    }
  }, [config.siteId]);

  return { messages, pending, error, send, retry, reset, stop };
}
