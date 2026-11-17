# T6: Universal Website AI Assistant — Architecture

A visitor-facing AI assistant that any website built on this foundation can embed with one component. It answers **general questions** from the model's own knowledge and **website questions** only from knowledge the website supplies.

## Data flow

```
Browser (any page)                              Server (Next.js route handler)
──────────────────                              ───────────────────────────────
<AssistantWidget config>                        POST /api/assistant/chat
  useAssistantChat ── fetch (NDJSON) ──────▶      1. size check, origin policy, rate limit
    message + history (≤12 turns)                 2. Zod validation (chatRequestSchema)
    page context (collectPageContext)             3. site = getSite(siteId)      ← sites.ts registry
                                                  4. provider = resolveProvider() ← env (one provider, no fallback)
                                                  5. knowledge = getKnowledge(site) (cached)
                                                  6. retrieve: BM25(question + previous question, page boost)
                                                  7. prompt = rules + current page + top excerpts + trimmed history
  ◀── {meta} {delta}… {done} | {error} ───────    8. provider.stream() → NDJSON events
renders text progressively, sources, errors
```

The server keeps **no conversation state**. Each request carries its own (bounded) history from the visitor's tab, so one visitor's conversation can never leak into another's.

## Modules

| Area                 | Files                                                                                           | Responsibility                                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared contract      | `src/lib/assistant/{types,schema,limits}.ts`                                                    | Wire types (`ChatStreamEvent`, `PageContext`, `AssistantClientConfig`), Zod request schema, hard limits                                                                      |
| Providers (T6.1)     | `src/server/assistant/providers/*`                                                              | `AiProvider` interface; `ollama.ts`, `openrouter.ts`, `gemini.ts` adapters; `http.ts` (POST + SSE/NDJSON parsing, error mapping, output cap); `index.ts` `resolveProvider()` |
| Knowledge (T6.2)     | `src/server/assistant/knowledge/*`                                                              | `WebsiteKnowledgeConfig` (structured), Markdown loader (one chunk per `##` section), Unicode tokenizer, `Retriever` interface + BM25 `createKeywordRetriever`                |
| Prompting (T6.2/5/6) | `src/server/assistant/prompt.ts`                                                                | Grounding rules, Malayalam instruction, page block, knowledge block, history trimming, follow-up retrieval text, sources                                                     |
| Orchestration        | `src/server/assistant/service.ts`                                                               | `prepareChat()`: site → provider → retrieval → prompt → event stream; safe error mapping; metadata-only logging                                                              |
| Security (T6.8)      | `src/server/assistant/security.ts`, route handlers                                              | Origin policy, per-IP + global rate limits, body size cap                                                                                                                    |
| Site registry (T6.7) | `src/server/assistant/sites.ts`                                                                 | `AssistantSiteDefinition` list; cached knowledge per site                                                                                                                    |
| API                  | `src/app/api/assistant/chat/route.ts`, `status/route.ts`                                        | Streaming chat; provider health (no inference)                                                                                                                               |
| Widget (T6.3/4/5)    | `src/components/assistant/*`                                                                    | `AssistantWidget`, `useAssistantChat`, `collectPageContext`, NDJSON reader, safe message renderer                                                                            |
| Demo site (T6.9)     | `src/assistant-sites/malabar-spice/*`, `content/assistant/malabar-spice/*.md`, `src/app/demo/*` | A complete example website + its assistant configuration                                                                                                                     |

## Provider abstraction

```ts
interface AiProvider {
  id: "ollama" | "openrouter" | "gemini";
  model: string;
  stream(req: { messages; maxOutputTokens; temperature?; signal }): AsyncIterable<string>;
  health(signal?): Promise<{ ok; provider; model; detail }>;
}
```

- Failures throw `ProviderError` with a `kind` (`not_configured`, `unavailable`, `timeout`, `rate_limited`, `quota`, `auth`, `bad_response`). The service maps each kind to a fixed visitor-safe message; details go only to server logs.
- Timeouts: `AbortSignal.any([visitor disconnect, AI_TIMEOUT_MS])` is passed to `fetch`, so the upstream request is cancelled too.
- Streams are decoded with a streaming `TextDecoder` (multi-byte Malayalam characters split across chunks stay intact) and capped at 16,000 characters.
- **No automatic fallback.** Exactly one provider (`AI_PROVIDER`) is active, so traffic can never silently move to another, possibly paid, provider. OpenRouter refuses non-`:free` models unless `OPENROUTER_ALLOW_PAID_MODELS=true`.
- Adding a provider: write `createXProvider()` implementing `AiProvider` with the helpers in `http.ts`, then add a `case` in `resolveProvider()` and env vars in `src/lib/env.ts`.

## Knowledge retrieval

1. **Ingestion:** `chunksFromConfig()` turns structured data (identity, pages, products, services, features, FAQs, policies, contact, workflows) into chunks; `chunksFromMarkdown()` splits Markdown files into one chunk per `##` section, with front-matter `title/url/kind/tags`.
2. **Normalization:** NFC, lower-case, tokens = runs of Unicode letters/marks/digits (Malayalam words stay whole), English stopwords, light English stemming.
3. **Retrieval:** BM25 with title/tags ×3 and a boost for chunks on the visitor's current page. The query is the new message **plus the previous visitor message**, so follow-ups ("what about damaged ones?") keep their topic. A minimum score means unrelated questions retrieve **nothing**, so they are answered as general questions.
4. **Context selection:** top 5 chunks within a 5,000-character budget.
5. **Grounded generation:** the system prompt tells the model to use only the excerpts for website facts, to say when information is missing, and to mention page names. Excerpts are labelled as data, not instructions.
6. **Sources:** the retrieved chunks are sent to the browser in the `meta` event and shown as links under the answer.

The `Retriever` interface (`search({ text, pagePath, limit })`) allows an embeddings/vector retriever later without touching the chat service.

## Page awareness

`collectPageContext()` runs when the visitor sends a message (so it is always the current page after client navigation). It captures the **path without query string or hash**, `<title>`, `<meta name="description">` and text only from elements the website explicitly marks with `data-assistant-context`. It never reads form controls, `[contenteditable]`, anything inside a `<form>`, or subtrees marked `data-assistant-ignore`. All fields are size-limited on both client and server.

## Conversation continuity

The widget keeps the conversation in `sessionStorage` (per tab, cleared when the tab closes, and by "New chat"). It survives navigation between pages. Each request sends the last 12 finished turns; the server trims again to 12 messages / 12,000 characters, starting with a user turn.

## Deployment reality

- **Local:** `AI_PROVIDER=ollama` uses a model on the developer's machine. It is free, but it is only reachable from that machine.
- **Public website:** a model on a laptop cannot serve website visitors. A public deployment needs a hosted provider (OpenRouter `:free` models or the Gemini free tier) with server-side keys. Free tiers have rate and daily limits; see `T6_PROVIDER_GUIDE.md`.
- The live Vercel deployment has **no** `AI_PROVIDER` set, so the assistant there reports "not set up yet" until a hosted provider is configured.
