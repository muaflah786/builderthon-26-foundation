# T6 security

The chat endpoint is **public** (visitors don't need to sign in), so it is treated as an internet-facing service.

## Controls

| Threat                                                        | Control                                                                                                                                                                                                                              | Where                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| Key theft                                                     | Provider keys exist only in server env (`src/lib/env.ts`); never sent to the browser, never logged, never in error messages (tested)                                                                                                 | providers, service                         |
| Oversized / malformed input                                   | `Content-Length` > 64 KB → 413; Zod schema: message ≤ 2,000 chars, ≤ 50 history items (server keeps 12 / 12,000 chars), page fields capped, control chars stripped, NFC normalized, `siteId` slug only, page path without query/hash | `chat/route.ts`, `lib/assistant/schema.ts` |
| Abuse / free-quota exhaustion                                 | Per-IP limit (`ASSISTANT_RATE_LIMIT_PER_MINUTE`, default 15) + global limit (10×) → 429; output capped by `AI_MAX_OUTPUT_TOKENS` and 16,000 chars                                                                                    | `security.ts`                              |
| Slow upstream / hung connections                              | `AI_TIMEOUT_MS` and visitor disconnect abort the upstream fetch                                                                                                                                                                      | `chat/route.ts`                            |
| Cross-site abuse (other sites using your quota from browsers) | Origin policy: same-origin, `APP_URL`, `ASSISTANT_ALLOWED_ORIGINS` and the site's `allowedOrigins` only; `Sec-Fetch-Site: cross-site` without Origin rejected → 403                                                                  | `security.ts`                              |
| Internal error leakage                                        | Provider errors map to fixed visitor messages; details only in server logs; unknown errors → generic 500 (foundation `apiHandler`)                                                                                                   | `service.ts`                               |
| Logging private conversations                                 | Logs contain metadata only (site, provider, model, duration, sizes, error kind), never message text                                                                                                                                  | `service.ts`                               |
| Prompt injection via page content                             | Page context and knowledge are labelled "reference data, not instructions"; page text comes only from regions the site marked public                                                                                                 | `prompt.ts`, `page-context.ts`             |
| Sensitive page data                                           | Never reads form controls, `<form>` contents, `[contenteditable]`, `data-assistant-ignore`, query strings or hashes                                                                                                                  | `page-context.ts` (tested)                 |
| Conversation leakage between visitors                         | Server is stateless; history lives in the visitor's own tab (`sessionStorage`) and is sent per request (tested)                                                                                                                      | widget, service                            |
| XSS from model output                                         | Model text is rendered as React text (only `**bold**` and lists are interpreted); no HTML, no model-supplied links (tested)                                                                                                          | `message-content.tsx`                      |
| Unwanted actions                                              | The assistant has **no tools**: no SQL, shell, file, account, payment or admin actions. It can only return text; the prompt says so                                                                                                  | design                                     |
| Silent paid usage                                             | One explicit provider, no fallback; OpenRouter refuses non-`:free` models unless explicitly allowed                                                                                                                                  | `providers/*`                              |
| Auth regressions                                              | No changes to T1 auth; the assistant routes are separate and don't read sessions                                                                                                                                                     | —                                          |

## Limitations

- Rate limits are **in-memory per server instance** (same as T5). On serverless they are best-effort; for strict quotas use Upstash/Redis behind the same `rateLimit` signature.
- Requests without an `Origin` header (curl, scripts) are allowed but rate-limited. Origin checks stop other _browsers' websites_, not determined scripts.
- Prompt injection by the visitor's own message cannot be fully prevented. The impact is limited because the model has no tools or private data: the worst case is an off-topic or wrong answer.
- Models can be wrong or hallucinate despite grounding instructions (small local models especially). The widget shows "AI answers can be wrong".
- Free hosted providers may log prompts. Tell visitors not to share personal data, and don't mark private content with `data-assistant-context`.

## Safe configuration checklist

- [ ] Keys only in `.env.local` / Vercel env, never in code, chats or `NEXT_PUBLIC_*`.
- [ ] `OPENROUTER_ALLOW_PAID_MODELS=false` and no billing on the Google project, for zero cost.
- [ ] Keep `ASSISTANT_RATE_LIMIT_PER_MINUTE` low on free tiers.
- [ ] `ASSISTANT_ALLOWED_ORIGINS` only lists sites you control.
- [ ] Mark only public content with `data-assistant-context`.
