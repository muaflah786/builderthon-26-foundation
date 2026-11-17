"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ASSISTANT_LIMITS } from "@/lib/assistant/limits";
import type { AssistantClientConfig } from "@/lib/assistant/types";
import { cn } from "@/lib/utils";
import { MessageContent } from "@/components/assistant/message-content";
import { collectPageContext } from "@/components/assistant/page-context";
import { useAssistantChat } from "@/components/assistant/use-assistant-chat";

/**
 * Floating AI assistant for any website:
 *
 *   <AssistantWidget config={myAssistantConfig} />
 *
 * Talks to /api/assistant/chat (server picks the provider and knowledge for
 * config.siteId). Uses the design-system tokens; `theme.accentColor` overrides
 * the primary colour for this widget only.
 */
export function AssistantWidget({ config }: { config: AssistantClientConfig }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const pathname = usePathname();
  const panelId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const getPage = useCallback(
    () => (typeof document === "undefined" ? undefined : collectPageContext()),
    [],
  );
  const { messages, pending, error, send, retry, reset, stop } = useAssistantChat(config, getPage);

  // Current page label, refreshed after every client-side navigation.
  const [pageTitle, setPageTitle] = useState<string>();
  useEffect(() => {
    const id = requestAnimationFrame(() => setPageTitle(collectPageContext().title));
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Keep the newest message in view while streaming.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const close = () => {
    setOpen(false);
    launcherRef.current?.focus();
  };

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || pending) return;
    send(text);
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const left = config.theme?.position === "bottom-left";
  const style = config.theme?.accentColor
    ? ({ "--primary": config.theme.accentColor } as CSSProperties)
    : undefined;
  const lastAssistant = messages.at(-1);
  const thinking = pending && lastAssistant?.role === "assistant" && !lastAssistant.content;

  return (
    <div
      className={cn(
        "fixed bottom-4 z-40 flex flex-col gap-3 sm:bottom-6",
        left ? "left-4 items-start sm:left-6" : "right-4 items-end sm:right-6",
      )}
      style={style}
      data-assistant-ignore
    >
      {open ? (
        <section
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-label={`${config.assistantName} chat`}
          onKeyDown={(e) => e.key === "Escape" && close()}
          className="border-border bg-background text-foreground flex h-[min(36rem,calc(100dvh-6rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border shadow-2xl sm:w-96"
        >
          <header className="bg-primary text-primary-foreground flex items-center gap-3 px-4 py-3">
            <span
              aria-hidden="true"
              className="bg-primary-foreground/20 flex size-8 items-center justify-center rounded-full text-sm font-semibold"
            >
              {config.assistantName.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold">{config.assistantName}</h2>
              <p className="truncate text-xs opacity-80">
                {pageTitle ? `AI assistant · on “${pageTitle}”` : "AI assistant"}
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              disabled={messages.length === 0}
              className="hover:bg-primary-foreground/15 rounded-md px-2 py-1 text-xs font-medium disabled:opacity-50"
            >
              New chat
            </button>
            <button
              type="button"
              onClick={close}
              aria-label="Close assistant"
              className="hover:bg-primary-foreground/15 rounded-md p-1"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </header>

          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm"
            aria-live="polite"
            aria-busy={pending}
          >
            <Bubble role="assistant">
              <MessageContent text={config.welcomeMessage} />
            </Bubble>

            {messages.length === 0 && config.suggestedQuestions?.length ? (
              <div className="flex flex-wrap gap-2 pt-1" aria-label="Suggested questions">
                {config.suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    disabled={pending}
                    className="border-border hover:bg-muted rounded-full border px-3 py-1.5 text-left text-xs"
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : null}

            {messages.map((m) => (
              <Bubble key={m.id} role={m.role}>
                {m.content ? (
                  <MessageContent text={m.content} />
                ) : m.status === "streaming" ? (
                  <TypingDots />
                ) : null}
                {m.status === "streaming" && m.content ? (
                  <span
                    aria-hidden="true"
                    className="bg-foreground/60 ml-0.5 inline-block h-3.5 w-1.5 align-middle motion-safe:animate-pulse"
                  />
                ) : null}
                {m.role === "assistant" && m.status === "done" && m.sources?.length ? (
                  <Sources sources={m.sources} />
                ) : null}
              </Bubble>
            ))}

            {error ? (
              <div
                role="alert"
                className="border-danger/40 bg-danger/5 text-foreground rounded-lg border px-3 py-2 text-xs"
              >
                <p>{error.message}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="text-primary mt-1 font-semibold underline underline-offset-2"
                >
                  Try again
                </button>
              </div>
            ) : null}
          </div>

          <form onSubmit={submit} className="border-border flex items-end gap-2 border-t p-3">
            <label htmlFor={`${panelId}-input`} className="sr-only">
              Message {config.assistantName}
            </label>
            <textarea
              id={`${panelId}-input`}
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              maxLength={ASSISTANT_LIMITS.maxMessageChars}
              placeholder={config.inputPlaceholder ?? "Type your question…"}
              lang={config.locale}
              className="border-input bg-background placeholder:text-muted-foreground max-h-32 min-h-10 flex-1 resize-none rounded-lg border px-3 py-2 text-sm"
            />
            {thinking || (pending && lastAssistant?.content) ? (
              <button
                type="button"
                onClick={stop}
                className="border-input hover:bg-muted h-10 rounded-lg border px-3 text-sm font-medium"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!draft.trim() || pending}
                aria-label="Send message"
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex size-10 items-center justify-center rounded-lg disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </form>
          <p className="text-muted-foreground px-3 pb-2 text-[11px]">
            AI answers can be wrong. Check important details on the website.
          </p>
        </section>
      ) : null}

      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? `Close ${config.assistantName}` : `Chat with ${config.assistantName}`}
        className="bg-primary text-primary-foreground hover:bg-primary/90 flex size-14 items-center justify-center rounded-full shadow-lg transition-transform motion-safe:hover:scale-105"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true">
            <path
              d="M4 5h16v10H9l-5 4V5z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M8 10h.01M12 10h.01M16 10h.01"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  return (
    <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 leading-relaxed",
          role === "user"
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm",
        )}
      >
        <span className="sr-only">{role === "user" ? "You said:" : "Assistant:"}</span>
        {children}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="Assistant is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="bg-muted-foreground size-1.5 rounded-full motion-safe:animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

function Sources({ sources }: { sources: Array<{ id: string; title: string; url?: string }> }) {
  const linked = sources.filter((s) => s.url).slice(0, 4);
  if (!linked.length) return null;
  return (
    <div className="border-border mt-2 border-t pt-2 text-xs">
      <p className="text-muted-foreground mb-1">Sources</p>
      <ul className="flex flex-wrap gap-1.5">
        {linked.map((s) => (
          <li key={s.id}>
            <Link
              href={s.url!}
              className="border-border hover:bg-background inline-block rounded-full border px-2 py-0.5"
            >
              {s.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
