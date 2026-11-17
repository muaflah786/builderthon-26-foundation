import type { ReactNode } from "react";
import { slug } from "@/server/assistant/knowledge/loaders";

/**
 * Minimal Markdown renderer for the demo's knowledge files (front matter,
 * #/## headings, paragraphs, - and 1. lists). Section ids match the
 * assistant's source links (e.g. /demo/shipping-returns#damaged-or-wrong-items).
 */
export function Markdown({ source, showTitle = true }: { source: string; showTitle?: boolean }) {
  const body = source.replace(/\r\n/g, "\n").replace(/^---\n[\s\S]*?\n---\n?/, "");
  const nodes: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];

  const flush = () => {
    if (para.length) {
      nodes.push(<p key={nodes.length}>{para.join(" ")}</p>);
      para = [];
    }
    if (list) {
      const items = list.items.map((t, i) => <li key={i}>{t}</li>);
      nodes.push(
        list.ordered ? (
          <ol key={nodes.length} className="list-decimal space-y-1 pl-6">
            {items}
          </ol>
        ) : (
          <ul key={nodes.length} className="list-disc space-y-1 pl-6">
            {items}
          </ul>
        ),
      );
      list = null;
    }
  };

  for (const line of body.split("\n")) {
    const h2 = /^##\s+(.+)$/.exec(line);
    const h1 = /^#\s+(.+)$/.exec(line);
    const ul = /^\s*-\s+(.+)$/.exec(line);
    const ol = /^\s*\d+\.\s+(.+)$/.exec(line);
    if (h2) {
      flush();
      nodes.push(
        <h2 key={nodes.length} id={slug(h2[1])} className="scroll-mt-20 pt-4 text-xl font-semibold">
          {h2[1]}
        </h2>,
      );
    } else if (h1) {
      flush();
      if (showTitle)
        nodes.push(
          <h2 key={nodes.length} className="text-2xl font-semibold">
            {h1[1]}
          </h2>,
        );
    } else if (ul || ol) {
      // A paragraph is never open while a list is open (text lines flush the list).
      if (para.length) flush();
      const ordered = Boolean(ol);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((ul ?? ol)![1]);
    } else if (!line.trim()) {
      flush();
    } else {
      if (list) flush();
      para.push(line.trim());
    }
  }
  flush();
  return <div className="text-foreground/90 space-y-3 leading-relaxed">{nodes}</div>;
}
