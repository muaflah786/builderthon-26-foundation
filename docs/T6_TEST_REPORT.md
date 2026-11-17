# T6 test report (consolidated verification, 2026-11-17)

Machine: Windows 11, Node 24.18, Ollama 0.40.16 with `qwen2.5:3b` (CPU, AMD Radeon 820M). Branch `task/universal-ai-assistant`.

**Final re-run after all fixes (code of commit `f6a1f04`):** typecheck 0 errors · ESLint 0 problems · Prettier clean · 232/232 unit/integration · production build without warnings · Playwright 23/23. The real-inference results below were produced on the same code.

| Check                                                                                      | Result           | Evidence                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript typecheck                                                                       | PASS             | 0 errors                                                                                                                                                                                                               |
| ESLint                                                                                     | PASS             | 0 problems (2 React hook issues found and fixed: ref written during render, setState in effect)                                                                                                                        |
| Prettier                                                                                   | PASS             | all files formatted                                                                                                                                                                                                    |
| Unit + integration (all)                                                                   | PASS             | **34 files, 232 tests** (149 foundation + 83 T6)                                                                                                                                                                       |
| Foundation regression T1–T5                                                                | PASS             | all existing unit tests + 14 existing E2E pass unchanged                                                                                                                                                               |
| Provider tests (Ollama/OpenRouter/Gemini via mocked HTTP)                                  | PASS             | streaming, UTF-8 chunk splits, timeouts, unavailable, 401/402/404/429/5xx mapping, `:free` guard, no key leakage, health                                                                                               |
| Knowledge tests                                                                            | PASS             | ingestion, relevant/irrelevant retrieval, page boost, Malayalam stemming, missing info                                                                                                                                 |
| Conversation tests                                                                         | PASS             | follow-up retrieval, history limits, reset, statelessness                                                                                                                                                              |
| Page-context tests (jsdom)                                                                 | PASS             | path/title/description, marked regions only, forms/passwords/ignored excluded, size limits                                                                                                                             |
| Security tests                                                                             | PASS             | 422 invalid, 413 oversized, 400 malformed, 404 site, 503 not configured (no internal leak), 403 foreign origin, 429 rate limit, mid-stream error sanitised, no secret reflection                                       |
| Widget tests (jsdom)                                                                       | PASS             | open/close/Escape, streaming, sources, Enter/Shift+Enter, suggestions, history, error + retry, new chat, restore, Malayalam, no HTML injection                                                                         |
| Production build                                                                           | PASS             | no warnings; knowledge Markdown traced into `/api/assistant/chat` and `/demo/*` bundles                                                                                                                                |
| Browser E2E (Playwright)                                                                   | PASS             | **23/23** (14 foundation + 9 assistant: UI with scripted stream, page context across navigation, Malayalam rendering, reset, mobile 360px, keyboard, real not-configured backend, origin/validation, Markdown anchors) |
| **Real model inference** (production build + Ollama qwen2.5:3b, `npm run assistant:smoke`) | PASS (5/5)       | general knowledge (sky colour), return policy grounded, follow-up "damaged products" (48 h, photo), page-aware price (₹420 / 100 g), Malayalam question → correct product and ₹240                                     |
| Real: mixed Malayalam–English + follow-up                                                  | PASS (content)   | garam masala retrieved; "അതിന്റെ price എത്ര?" → ₹190 for 150 g                                                                                                                                                           |
| Real: not-offered items                                                                    | PASS (after fix) | "Do you sell saffron?" → "not listed"; "ship to the USA?" → "only within India"                                                                                                                                        |
| OpenRouter / Gemini live inference                                                         | BLOCKED          | no API keys (must be created by the owner, never pasted in chat)                                                                                                                                                       |
| Live Vercel deployment                                                                     | NOT RUN          | out of scope; production untouched                                                                                                                                                                                     |

## Defects found by the campaign and fixed

1. Retrieval ranked a file intro above the specific "Returns and refunds" section → section-heading boost.
2. Malayalam inflection (`കുരുമുളകിന്റെ`) didn't match `കുരുമുളക്` → Malayalam suffix stemmer.
3. **Real-model hallucination:** "Do you sell saffron?" → "Yes" → complete catalogue always in the prompt + "not listed = not sold" rule.
4. The current page was shown as a "source" for unrelated questions → sources limited to word-matched chunks.
5. A blank `AI_PROVIDER=` crashed the app at startup → blank = unset.
6. "New chat" left `[]` in sessionStorage → key removed.

## Known quality limits (not defects in the pipeline)

- `qwen2.5:3b` writes Malayalam in the right script with the right facts, but with poor grammar. Use a larger model (`qwen2.5:7b`) or Gemini for good Malayalam.
- CPU inference: 1–5 s to first token when warm, 3–14 s total per answer.
