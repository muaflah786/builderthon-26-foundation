# T6 provider guide

Exactly **one** provider is active, chosen by `AI_PROVIDER`. There is no automatic fallback, so traffic never moves silently to a different (possibly paid) service. Keys are read **only on the server** (`src/lib/env.ts`), never sent to the browser, and never logged.

|                            | Ollama                                           | OpenRouter                                                            | Google Gemini                                                              |
| -------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `AI_PROVIDER`              | `ollama`                                         | `openrouter`                                                          | `gemini`                                                                   |
| Cost                       | Free (your hardware)                             | Free models only (ids ending `:free`); paid models refused by default | Free tier on some models; paid if billing is enabled on the Google project |
| Works for a public website | **No**, only the machine running it              | Yes                                                                   | Yes                                                                        |
| Needs an account/key       | No                                               | Yes (`OPENROUTER_API_KEY`)                                            | Yes (`GEMINI_API_KEY`)                                                     |
| Malayalam quality          | Depends on model; small models are weak          | Depends on model                                                      | Generally good on current Gemini models                                    |
| Status in this repo        | ✅ implemented, **verified with real inference** | ✅ implemented, unit-tested, **not verified live** (no key)           | ✅ implemented, unit-tested, **not verified live** (no key)                |

## Ollama (local, free)

```bash
ollama pull qwen2.5:3b
```

```env
AI_PROVIDER=ollama
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

- Other good small multilingual models: `qwen2.5:7b` (better, needs about 8 GB RAM free), `gemma3:4b`, `llama3.2:3b`. Pull the model, then change `OLLAMA_MODEL`.
- If Ollama isn't running, the status endpoint says so and chat returns "The AI service is unavailable right now".
- **Important:** `localhost:11434` exists only on your computer. A Vercel deployment cannot reach it. Exposing it with a tunnel would make your laptop the public server, so don't do that for a real website.

## OpenRouter (hosted, free models)

1. Create an account at https://openrouter.ai and a key under **Keys**. Don't add credits if you want zero cost.
2. Pick a model whose id ends in **`:free`** from https://openrouter.ai/models (filter by price = 0). Free models change over time, so the model is always explicit configuration.
3. Configure (locally in `.env.local`, or in Vercel → Environment Variables):

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=...            # never commit, never paste into chats
OPENROUTER_MODEL=<model-id>:free
OPENROUTER_ALLOW_PAID_MODELS=false
```

- Free models have per-minute and per-day request limits set by OpenRouter (they have changed over time; check the current limits on their docs). When exceeded, visitors see "The AI service is busy right now".
- The adapter **refuses** any model not ending in `:free` unless `OPENROUTER_ALLOW_PAID_MODELS=true`.
- Free-model providers may log prompts. Don't send personal data, which is one reason page context excludes forms.

## Google Gemini

1. Get a key at https://aistudio.google.com (API keys).
2. Configure:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

- The free tier has strict per-minute and per-day quotas that Google changes over time. Exceeding them returns 429, which visitors see as "busy".
- On the free tier Google may use prompts and responses to improve its products. If the Google Cloud project has **billing enabled**, usage may be charged, so keep billing off for a zero-cost setup.

## Choosing for Builderthon

| Situation                           | Use                                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| Building and testing on your laptop | Ollama                                                                                        |
| Live public demo URL                | OpenRouter `:free` or Gemini free tier, configured in Vercel. Test the quota before the demo. |
| Demo without internet               | Ollama on the presenting laptop, with the app running locally (`npm run build && npm start`)  |

## Limits that protect free quotas

- `ASSISTANT_RATE_LIMIT_PER_MINUTE` (default 15) per visitor IP, plus a global limit of 10× that per server instance.
- `AI_MAX_OUTPUT_TOKENS` (default 512) caps each answer; answers are also capped at 16,000 characters.
- `AI_TIMEOUT_MS` (default 90 s) cancels slow requests upstream.
