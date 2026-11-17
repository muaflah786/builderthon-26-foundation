# T6 integration guide: adding the assistant to another website

The demo site (`malabar-spice`) is a complete working example. Copy its pattern.

## Step 1: create the site folder

```
src/assistant-sites/<site-id>/
  knowledge.ts   # WebsiteKnowledgeConfig (see T6_KNOWLEDGE_GUIDE.md)
  server.ts      # AssistantSiteDefinition (server-only)
  client.ts      # AssistantClientConfig (browser-safe)
content/assistant/<site-id>/*.md   # optional Markdown knowledge
```

`<site-id>` is a lowercase slug, e.g. `city-library`.

**server.ts**

```ts
import "server-only";
import { buildKnowledgeBase, readMarkdownFolder } from "@/server/assistant/knowledge";
import type { AssistantSiteDefinition } from "@/server/assistant/sites";
import { myKnowledge } from "./knowledge";

export const citySite: AssistantSiteDefinition = {
  id: "city-library",
  assistantName: "Lumi",
  instructions: "You help library members. Never promise book availability.",
  // preferredProvider: "gemini",          // optional: must equal AI_PROVIDER
  // allowedOrigins: ["https://library.example"], // optional: other sites calling this API
  // maxOutputTokens: 400,
  loadKnowledge: async () =>
    buildKnowledgeBase({ config: myKnowledge, markdown: await readMarkdownFolder("city-library") }),
};
```

**client.ts**

```ts
import type { AssistantClientConfig } from "@/lib/assistant/types";

export const cityAssistant: AssistantClientConfig = {
  siteId: "city-library",
  assistantName: "Lumi",
  welcomeMessage: "Hi! Ask me about membership, timings or events.",
  suggestedQuestions: ["What are your opening hours?", "How do I renew a book?"],
  inputPlaceholder: "Ask about the library…",
  locale: "en",
  pageContext: true, // send current page path/title/description/marked content
  persistConversation: true, // keep the chat across page navigations (sessionStorage)
  theme: { accentColor: "#0f766e", position: "bottom-right" },
};
```

## Step 2: register the site

In `src/server/assistant/sites.ts`, import your definition and add it to `SITES`.

If Markdown files are used, `next.config.ts` already ships `content/assistant/**` with the `/api/assistant/*` functions (`outputFileTracingIncludes`).

## Step 3: render the widget

In the layout of the pages that should have the assistant:

```tsx
import { AssistantWidget } from "@/components/assistant";
import { cityAssistant } from "@/assistant-sites/city-library/client";

<AssistantWidget config={cityAssistant} />;
```

It is a fixed-position client component and doesn't change your layout. It uses the design-system tokens (`--primary`, `--background`, ...), so it matches your theme; `theme.accentColor` overrides the colour for the widget only.

## Step 4: mark public page content (optional)

```tsx
<article data-assistant-context> ...public product text... </article>
<div data-assistant-ignore> ...never send this... </div>
```

Only marked regions are read. Form fields and anything inside `<form>` are never read.

## Step 5: configure a provider and test

See `T6_PROVIDER_GUIDE.md`, then run `npm run assistant:smoke -- http://localhost:3000 <site-id>`. Edit the questions in `scripts/assistant-smoke.mjs` for your site.

## API (for custom UIs)

`POST /api/assistant/chat` with JSON `{ siteId, message, history?: [{role, content}], page?: {path, title?, description?, content?} }`.

Response: `application/x-ndjson`, one JSON per line:

```json
{"type":"meta","sources":[{"id":"…","title":"…","url":"/…"}],"provider":"ollama","model":"qwen2.5:3b"}
{"type":"delta","text":"Unopened "}
{"type":"delta","text":"products…"}
{"type":"done"}
```

or a final `{"type":"error","code":"timeout","message":"…"}`. Errors before streaming use the foundation's JSON envelope (`422`, `403`, `404`, `413`, `429`, `503`). `useAssistantChat(config, getPage)` and `readChatStream()` can be reused for a custom interface.

`GET /api/assistant/status?siteId=…` → `{ ready, configured, provider, model, detail }` (health check, no inference).

## Using the assistant on a site hosted elsewhere

The chat API is same-origin by default. To call it from another origin, add that origin to `ASSISTANT_ALLOWED_ORIGINS` (or the site's `allowedOrigins`) and set the widget's `endpoint` to the full URL. Responses are not CORS-enabled yet, so a cross-origin browser embed needs a small CORS addition (see T6_IMPLEMENTATION_STATUS "Remaining work").
