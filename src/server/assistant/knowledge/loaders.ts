import type {
  KnowledgeChunk,
  KnowledgeKind,
  WebsiteKnowledgeConfig,
} from "@/server/assistant/knowledge/types";

const KINDS = new Set<KnowledgeKind>([
  "overview",
  "page",
  "product",
  "service",
  "feature",
  "faq",
  "policy",
  "contact",
  "workflow",
  "general",
]);

export const slug = (value: string) =>
  value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "item";

/** Converts structured website knowledge into retrievable chunks. */
export function chunksFromConfig(config: WebsiteKnowledgeConfig): KnowledgeChunk[] {
  const out: KnowledgeChunk[] = [];
  const { identity } = config;

  out.push({
    id: "overview",
    kind: "overview",
    title: `About ${identity.name}`,
    url: "/",
    text: [
      `${identity.name}: ${identity.description}`,
      identity.purpose ? `Purpose: ${identity.purpose}` : "",
      identity.location ? `Location: ${identity.location}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  for (const page of config.pages ?? []) {
    out.push({
      id: `page:${page.path}`,
      kind: "page",
      title: `${page.title} page`,
      url: page.path,
      text: `The "${page.title}" page is at ${page.path}. ${page.summary}`,
      tags: ["page", "navigation", "where"],
    });
  }
  for (const p of config.products ?? []) {
    const details = Object.entries(p.details ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    out.push({
      id: `product:${p.id}`,
      kind: "product",
      title: p.name,
      url: p.url,
      text: [
        `Product: ${p.name}`,
        p.description,
        p.price ? `Price: ${p.price}` : "Price: not listed",
        details,
      ]
        .filter(Boolean)
        .join("\n"),
      tags: ["product", ...(p.price ? ["price", "cost"] : []), ...(p.tags ?? [])],
    });
  }
  for (const s of config.services ?? []) {
    out.push({
      id: `service:${slug(s.name)}`,
      kind: "service",
      title: s.name,
      url: s.url,
      text: `Service: ${s.name}. ${s.description}`,
      tags: ["service"],
    });
  }
  for (const f of config.features ?? []) {
    out.push({
      id: `feature:${slug(f.name)}`,
      kind: "feature",
      title: f.name,
      url: f.url,
      text: `Feature: ${f.name}. ${f.description}`,
      tags: ["feature"],
    });
  }
  for (const q of config.faqs ?? []) {
    out.push({
      id: `faq:${slug(q.question)}`,
      kind: "faq",
      title: q.question,
      url: q.url,
      text: `Q: ${q.question}\nA: ${q.answer}`,
      tags: ["faq", "question"],
    });
  }
  for (const p of config.policies ?? []) {
    out.push({
      id: `policy:${slug(p.name)}`,
      kind: "policy",
      title: p.name,
      url: p.url,
      text: `${p.name}: ${p.text}`,
      tags: ["policy", "rule"],
    });
  }
  if (config.contact) {
    out.push({
      id: "contact",
      kind: "contact",
      title: "Contact and help",
      url: config.contact.url,
      text: config.contact.text,
      tags: ["contact", "help", "support", "email", "phone"],
    });
  }
  for (const w of config.workflows ?? []) {
    out.push({
      id: `workflow:${slug(w.name)}`,
      kind: "workflow",
      title: w.name,
      url: w.url,
      text: `How to ${w.name}:\n${w.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
      tags: ["how", "steps", "guide"],
    });
  }
  return out;
}

/**
 * Parses a Markdown knowledge file into chunks, one per `##` section.
 *
 *   ---
 *   title: Shipping & returns
 *   url: /demo/shipping-returns
 *   kind: policy
 *   tags: returns, refund, shipping
 *   ---
 *   Intro paragraph...
 *   ## Damaged items
 *   ...
 *
 * Front matter is a tiny `key: value` subset (no YAML library needed).
 */
export function chunksFromMarkdown(fileId: string, markdown: string): KnowledgeChunk[] {
  const source = markdown.normalize("NFC").replace(/\r\n/g, "\n");
  const meta: Record<string, string> = {};
  let body = source;
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(source);
  if (fm) {
    body = source.slice(fm[0].length);
    for (const line of fm[1].split("\n")) {
      const m = /^([A-Za-z_]+)\s*:\s*(.*)$/.exec(line.trim());
      if (m) meta[m[1].toLowerCase()] = m[2].trim();
    }
  }
  const kind = KINDS.has(meta.kind as KnowledgeKind) ? (meta.kind as KnowledgeKind) : "general";
  const docTitle = meta.title || /^#\s+(.+)$/m.exec(body)?.[1]?.trim() || fileId;
  const url = meta.url || undefined;
  const tags = (meta.tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const sections: Array<{ heading?: string; lines: string[] }> = [{ lines: [] }];
  for (const line of body.split("\n")) {
    const h = /^##\s+(.+)$/.exec(line);
    if (h) sections.push({ heading: h[1].trim(), lines: [] });
    else if (!/^#\s+/.test(line)) sections[sections.length - 1].lines.push(line);
  }

  return sections
    .map((s) => ({ ...s, text: s.lines.join("\n").trim() }))
    .filter((s) => s.text.length > 0)
    .map((s) => ({
      id: s.heading ? `${fileId}#${slug(s.heading)}` : fileId,
      kind,
      title: s.heading ? `${docTitle}: ${s.heading}` : docTitle,
      section: s.heading,
      url: url && s.heading ? `${url}#${slug(s.heading)}` : url,
      text: s.heading ? `${docTitle} — ${s.heading}\n${s.text}` : s.text,
      tags,
    }));
}
