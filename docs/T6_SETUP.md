# T6 setup (local development)

## 1. Prerequisites

- The foundation set up as in `docs/WINDOWS_SETUP.md` (`npm ci`, `.env.local`, `npm run db:migrate`).
- **Ollama** for free local inference: install from https://ollama.com/download (Windows installer), then:

```bash
ollama pull qwen2.5:3b        # ~1.9 GB; multilingual, runs on CPU with 8+ GB RAM
ollama list                   # should show qwen2.5:3b
```

Ollama runs in the background and listens on `http://127.0.0.1:11434`.

## 2. Configure `.env.local`

```bash
AI_PROVIDER=ollama
OLLAMA_MODEL=qwen2.5:3b
# optional:
# OLLAMA_BASE_URL=http://127.0.0.1:11434
# AI_TIMEOUT_MS=90000          # CPU-only machines are slow; keep this generous
# AI_MAX_OUTPUT_TOKENS=512
```

Leave `AI_PROVIDER` unset (or blank) to disable the assistant. The rest of the app keeps working, and the widget shows "not set up yet".

## 3. Run

```bash
npm run dev
```

Open http://localhost:3000/demo and click the chat button (bottom right).

Check the provider without running any inference:

```bash
curl "http://localhost:3000/api/assistant/status?siteId=malabar-spice"
```

## 4. Real-inference smoke test

With `npm run dev` running in another terminal:

```bash
npm run assistant:smoke
```

It asks five real questions (general knowledge, website policy, follow-up, page-aware price, Malayalam), then prints each answer, its sources, the provider/model, time to first token and total time.

## 5. Tests

```bash
npm test              # unit/integration (providers use mocked HTTP; no model needed)
npm run test:e2e      # browser tests; E2E runs WITHOUT a provider (AI_PROVIDER="")
```

## Performance note

On a laptop without a usable GPU (verified on an AMD Radeon 820M machine), `qwen2.5:3b` takes roughly 5–20 s to start answering and streams a few words per second. For demos, warm the model first by asking one question. A hosted provider is much faster.
