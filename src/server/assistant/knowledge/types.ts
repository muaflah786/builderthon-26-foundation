/**
 * Website knowledge model. Every website supplies its own knowledge; the core
 * engine never contains website-specific facts.
 */

export type KnowledgeKind =
  | "overview"
  | "page"
  | "product"
  | "service"
  | "feature"
  | "faq"
  | "policy"
  | "contact"
  | "workflow"
  | "general";

/** One unit of retrievable knowledge (a section of a page, one product, one FAQ...). */
export type KnowledgeChunk = {
  /** Stable id, e.g. "policy:returns#damaged-items". */
  id: string;
  kind: KnowledgeKind;
  /** Human title shown as the source. */
  title: string;
  /** Section heading within a document (Markdown `##`), the most specific label; boosted in retrieval. */
  section?: string;
  /** Website page where the visitor can read this, if any. */
  url?: string;
  text: string;
  tags?: string[];
};

/** Structured knowledge a website can declare in TypeScript/JSON. */
export type WebsiteKnowledgeConfig = {
  identity: {
    name: string;
    description: string;
    purpose?: string;
    /** e.g. "Kozhikode, Kerala, India" */
    location?: string;
  };
  pages?: Array<{ path: string; title: string; summary: string }>;
  products?: Array<{
    id: string;
    name: string;
    url?: string;
    description: string;
    /** Free text, e.g. "₹240 for 200 g". Only stated prices are ever quoted. */
    price?: string;
    details?: Record<string, string>;
    tags?: string[];
  }>;
  services?: Array<{ name: string; description: string; url?: string }>;
  features?: Array<{ name: string; description: string; url?: string }>;
  faqs?: Array<{ question: string; answer: string; url?: string }>;
  policies?: Array<{ name: string; text: string; url?: string }>;
  contact?: { text: string; url?: string };
  workflows?: Array<{ name: string; steps: string[]; url?: string }>;
};

export type ScoredChunk = {
  chunk: KnowledgeChunk;
  score: number;
  /** Part of the score from matching the question's words (0 = included only because it is the current page). */
  lexicalScore: number;
};

export type RetrievalQuery = {
  /** Text to search for (usually the latest message plus recent context). */
  text: string;
  /** Current page path; chunks for this page get a boost. */
  pagePath?: string;
  limit: number;
};

/**
 * Retrieval abstraction. The initial implementation is keyword/BM25
 * (./keyword-retriever.ts); an embeddings/vector retriever can implement the
 * same interface later without touching the chat service.
 */
export interface Retriever {
  search(query: RetrievalQuery): ScoredChunk[];
}

/** A website's fully loaded knowledge base. */
export type KnowledgeBase = {
  identity: WebsiteKnowledgeConfig["identity"];
  chunks: KnowledgeChunk[];
  retriever: Retriever;
  /** Names of everything the website sells/offers, always given to the model so it can say "not listed". */
  catalog: string[];
};
