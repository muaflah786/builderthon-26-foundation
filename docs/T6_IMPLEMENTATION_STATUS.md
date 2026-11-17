# T6 implementation status

Branch `task/universal-ai-assistant` · worktree `../bt-t6` · based on `main` @ `1d43d0a`.
Status values: ✅ done · 🧪 done, awaiting the consolidated verification · ⛔ blocked · ⏳ not started.

## Phase A: implementation

| #     | Module                                                                                                                                                         | Status | Main files                                                                                   |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| T6.1  | Provider-independent engine: interface, streaming, timeouts, errors, health; Ollama, OpenRouter, Gemini adapters; no fallback; `:free` guard                   | ✅     | `src/server/assistant/providers/*`                                                           |
| T6.2  | Knowledge engine: structured + Markdown ingestion, Unicode normalization, BM25 retrieval, context selection, sources, honest "not found"                       | ✅     | `src/server/assistant/knowledge/*`, `prompt.ts`                                              |
| T6.3  | Current-page awareness: path/title/description/marked content; sensitive exclusion; limits                                                                     | ✅     | `src/components/assistant/page-context.ts`                                                   |
| T6.4  | Chat interface: launcher, panel, streaming, typing indicator, sources, error + retry, stop, new chat, suggestions, Enter-to-send, mobile, a11y, reduced motion | ✅     | `src/components/assistant/*`                                                                 |
| T6.5  | Conversation continuity: sessionStorage per tab, history limits, follow-up retrieval, reset                                                                    | ✅     | `use-assistant-chat.ts`, `prompt.ts`                                                         |
| T6.6  | Multilingual: Unicode-safe I/O, Malayalam detection → Malayalam reply instruction, Malayalam tokens in retrieval                                               | ✅     | `schema.ts`, `knowledge/text.ts`, `prompt.ts`                                                |
| T6.7  | Reusable configuration: `AssistantClientConfig`, `AssistantSiteDefinition`, site registry                                                                      | ✅     | `src/lib/assistant/types.ts`, `src/server/assistant/sites.ts`                                |
| T6.8  | Security: Zod, size limits, rate limits, origin policy, timeouts, safe errors, metadata-only logs, no tools                                                    | ✅     | `security.ts`, route handlers                                                                |
| T6.9  | Demo website "Malabar Spice Market" (home, shop, 8 product pages, shipping & returns, FAQ, about, contact)                                                     | ✅     | `src/app/demo/*`, `src/assistant-sites/malabar-spice/*`, `content/assistant/malabar-spice/*` |
| T6.10 | Developer experience: exports, examples, smoke script, env examples                                                                                            | ✅     | `src/components/assistant/index.ts`, `scripts/assistant-smoke.mjs`, `.env.example`           |
| T6.11 | Documentation (8 documents)                                                                                                                                    | ✅     | `docs/T6_*.md`                                                                               |
| T6.12 | Deployment reality documented; production untouched                                                                                                            | ✅     | `T6_PROVIDER_GUIDE.md`, `T6_ARCHITECTURE.md`                                                 |

Foundation changes, all additive: `src/lib/env.ts` (optional AI vars; blank = unset), `src/lib/errors.ts` (`SERVICE_UNAVAILABLE` 503), `next.config.ts` (`outputFileTracingIncludes` for knowledge files), `src/config/site.ts` (nav "AI demo"), `playwright.config.ts` (`AI_PROVIDER=""` for E2E), `package.json` (`assistant:smoke` script).

## Phase B/C: verification

See `T6_TEST_REPORT.md`.

## Blockers

- OpenRouter and Gemini live inference: **not verifiable** without API keys (the user must create them; keys must not be pasted into chats). The adapters are implemented and unit-tested against the documented wire formats.

## Remaining work (after this task)

- Cross-origin embedding on sites hosted elsewhere needs CORS headers + preflight on `/api/assistant/chat` (same-origin works now).
- Configure a hosted provider in Vercel to enable the assistant on the public deployment (needs the user's approval and a key).
- Optional: embeddings retriever behind the existing `Retriever` interface for large knowledge bases.
