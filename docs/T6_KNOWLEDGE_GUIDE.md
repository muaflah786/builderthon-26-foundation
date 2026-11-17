# T6 knowledge guide: giving the assistant your website's knowledge

The assistant knows **only** what you supply about your website, and it is instructed never to invent website facts. Good knowledge gives good answers.

## Two formats (use both)

### 1. Structured TypeScript/JSON: `src/assistant-sites/<site>/knowledge.ts`

Best for lists of things: products, pages, FAQs, contact details.

```ts
import type { WebsiteKnowledgeConfig } from "@/server/assistant/knowledge/types";

export const myKnowledge: WebsiteKnowledgeConfig = {
  identity: {
    name: "City Library",
    description: "Public library in Kochi.",
    purpose: "...",
    location: "Kochi",
  },
  pages: [{ path: "/membership", title: "Membership", summary: "How to join and fees." }],
  products: [
    {
      id: "annual",
      name: "Annual membership",
      url: "/membership",
      description: "...",
      price: "₹500 per year",
    },
  ],
  services: [{ name: "Book delivery", description: "...", url: "/delivery" }],
  features: [{ name: "Online renewals", description: "..." }],
  faqs: [{ question: "Can I renew online?", answer: "Yes, ...", url: "/faq" }],
  policies: [{ name: "Late fees", text: "₹2 per day ...", url: "/rules" }],
  contact: { text: "Email help@library.example, phone ...", url: "/contact" },
  workflows: [{ name: "join the library", steps: ["Open Membership", "..."], url: "/membership" }],
};
```

Each item becomes one retrievable chunk. Prices are quoted **exactly as written**; a product without `price` is described as "Price: not listed".

### 2. Markdown files: `content/assistant/<site>/*.md`

Best for prose: policies, about pages, guides. Each `##` section becomes one chunk.

```markdown
---
title: Shipping & returns
url: /shipping-returns
kind: policy
tags: delivery, refund, return policy
---

Intro paragraph (a chunk of its own).

## Damaged items

Rules for damaged items...
```

- `kind`: `overview | page | product | service | feature | faq | policy | contact | workflow | general`.
- `url` makes the source clickable; each section links to `url#section-slug`. Render the same file on your page with matching heading ids, as the demo does in `src/app/demo/_components/markdown.tsx`, so source links jump to the right section.
- `tags` add synonyms visitors might use ("refund" for a returns page). Tags and titles weigh 3× in retrieval.

## Writing knowledge that retrieves well

- One topic per `##` section, with a descriptive heading ("Delivery times", not "Section 2").
- Use the words visitors use: add them as `tags` (for example `return policy, refund, money back`).
- For a Malayalam audience, add Malayalam names as tags or details (for example product `malayalamName`) so Malayalam questions match.
- State limits explicitly ("We do not ship outside India") so the assistant can answer "no" truthfully.
- Keep each section under about 1,200 characters (longer sections are truncated in the prompt).

## How retrieval decides

- BM25 keyword scoring over each chunk's text + title + tags, plus a boost for chunks whose `url` is the page the visitor is on.
- The previous visitor question is added to the query, so follow-ups keep their topic.
- Below a minimum score nothing is retrieved, and the prompt then says no website information was found. The model answers general questions normally and says "I don't have that information" for unknown website questions.

## Check your knowledge

Add a test like `src/server/assistant/knowledge/knowledge.test.ts`: build the knowledge base and assert that typical questions retrieve the right chunk ids. This is the fastest way to tune tags and headings.
