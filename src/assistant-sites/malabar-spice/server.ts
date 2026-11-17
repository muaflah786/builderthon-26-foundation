import "server-only";

import { buildKnowledgeBase, readMarkdownFolder } from "@/server/assistant/knowledge";
import type { AssistantSiteDefinition } from "@/server/assistant/sites";
import { malabarSpiceKnowledge } from "@/assistant-sites/malabar-spice/knowledge";

/** Server-side assistant definition for the demo website. */
export const demoSpiceSite: AssistantSiteDefinition = {
  id: "malabar-spice",
  assistantName: "Mira",
  instructions: [
    "You help shoppers of an online Kerala spice shop.",
    "Recommend products only from the shop's product list, and say when something is out of stock.",
    "For cooking questions you may give general cooking advice, then suggest relevant products from the shop when it makes sense.",
    "Quote prices exactly as written in the website knowledge (with pack size).",
    "This is a demo website: the cart and checkout are not functional, but you can explain the ordering steps.",
  ].join("\n"),
  retrievalLimit: 5,
  loadKnowledge: async () =>
    buildKnowledgeBase({
      config: malabarSpiceKnowledge,
      markdown: await readMarkdownFolder("malabar-spice"),
    }),
};
