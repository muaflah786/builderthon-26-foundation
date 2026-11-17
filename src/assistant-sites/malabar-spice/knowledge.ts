import type { WebsiteKnowledgeConfig } from "@/server/assistant/knowledge/types";
import { DEMO_PAGES, DEMO_PRODUCTS, DEMO_SITE } from "@/assistant-sites/malabar-spice/catalog";
import { DEMO_FAQS } from "@/assistant-sites/malabar-spice/faqs";

/**
 * Structured knowledge for the demo website. Longer prose (policies, about,
 * how-to) lives in Markdown: content/assistant/malabar-spice/*.md
 */
export const malabarSpiceKnowledge: WebsiteKnowledgeConfig = {
  identity: {
    name: DEMO_SITE.name,
    description: `An online shop selling single-origin spices from Kerala. ${DEMO_SITE.tagline}`,
    purpose: "Sell fresh Kerala spices across India and help customers choose and use them.",
    location: DEMO_SITE.location,
  },
  pages: DEMO_PAGES.map((p) => ({ path: p.path, title: p.title, summary: p.summary })),
  products: DEMO_PRODUCTS.map((p) => ({
    id: p.slug,
    name: p.name,
    url: `${DEMO_SITE.basePath}/products/${p.slug}`,
    description: `${p.summary} ${p.description}`,
    price: `${p.price} for ${p.size}`,
    details: {
      "Malayalam name": p.malayalamName,
      Category: p.category,
      Origin: p.origin,
      Heat: p.heat,
      "Best for": p.bestFor.join(", "),
      Availability: p.inStock ? "In stock" : "Out of stock (temporarily unavailable)",
    },
    tags: [p.category, p.malayalamName, ...p.bestFor],
  })),
  services: [
    {
      name: "Gift boxes and corporate gifting",
      description:
        "Kerala Kitchen Gift Box (₹1,150). For 20 or more boxes, email for a bulk quote; bulk prices are not listed.",
      url: `${DEMO_SITE.basePath}/products/kerala-gift-box`,
    },
  ],
  faqs: DEMO_FAQS.map((f) => ({ ...f, url: `${DEMO_SITE.basePath}/faq` })),
  contact: {
    text: `Contact ${DEMO_SITE.name}: email ${DEMO_SITE.email}, phone ${DEMO_SITE.phone}, ${DEMO_SITE.hours}. Address: ${DEMO_SITE.location}. Include your order number for order questions.`,
    url: `${DEMO_SITE.basePath}/contact`,
  },
};
