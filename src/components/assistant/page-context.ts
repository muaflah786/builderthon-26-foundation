import { ASSISTANT_LIMITS as L } from "@/lib/assistant/limits";
import type { PageContext } from "@/lib/assistant/types";

/** Elements whose content is never read, even inside a marked region. */
const EXCLUDED =
  "input, textarea, select, option, button, form, script, style, noscript, template, [contenteditable], [data-assistant-ignore], [aria-hidden='true']";

const clip = (value: string | null | undefined, max: number) => {
  const v = (value ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
  return v ? v.slice(0, max) : undefined;
};

/** Visible text of an element, skipping form controls and opted-out subtrees. */
function publicText(root: Element): string {
  const parts: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === 3) {
      parts.push(node.textContent ?? "");
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node as Element;
    if (el.matches(EXCLUDED)) return;
    el.childNodes.forEach(walk);
    if (/^(P|DIV|LI|H[1-6]|SECTION|ARTICLE|TR|DD|DT)$/.test(el.tagName)) parts.push(" ");
  };
  walk(root);
  return parts.join(" ");
}

/**
 * Captures a small, non-sensitive description of the current page:
 * - path WITHOUT query string or hash (they can carry tokens or personal data);
 * - <title> and <meta name="description">;
 * - text ONLY from elements the page explicitly marked with `data-assistant-context`
 *   (never form fields, never unmarked content).
 */
export function collectPageContext(
  doc: Document = document,
  loc: Location = location,
): PageContext {
  const regions = Array.from(doc.querySelectorAll("[data-assistant-context]")).filter(
    (el) => !el.closest("form") && !el.closest("[data-assistant-ignore]"),
  );
  const content = clip(regions.map(publicText).join(" \n "), L.maxPageContentChars);
  const path = (loc.pathname || "/").slice(0, L.maxPathChars);
  return {
    path: /^\/[^\s?#]*$/.test(path) ? path : "/",
    title: clip(doc.title, L.maxTitleChars),
    description: clip(
      doc.querySelector('meta[name="description"]')?.getAttribute("content"),
      L.maxDescriptionChars,
    ),
    content,
  };
}
