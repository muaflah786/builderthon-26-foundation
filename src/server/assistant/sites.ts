import "server-only";

import type { KnowledgeBase } from "@/server/assistant/knowledge";
import type { ProviderId } from "@/server/assistant/providers";
import { demoSpiceSite } from "@/assistant-sites/malabar-spice/server";

/**
 * Server-side definition of one website that uses the assistant.
 * Secrets never live here (they come from env); this is safe to commit.
 */
export type AssistantSiteDefinition = {
  /** Matches AssistantClientConfig.siteId. Lowercase slug. */
  id: string;
  assistantName: string;
  /** Extra instructions appended to the system prompt (tone, focus, do/don't). */
  instructions?: string;
  /** If set, AI_PROVIDER must match (no silent provider switching). */
  preferredProvider?: ProviderId;
  /** Extra origins (besides APP_URL and same-origin) allowed to call the chat API for this site. */
  allowedOrigins?: string[];
  /** Per-site cap on answer length (tokens); defaults to AI_MAX_OUTPUT_TOKENS. */
  maxOutputTokens?: number;
  /** Max knowledge chunks retrieved per question. */
  retrievalLimit?: number;
  /** Loads (once) and returns the site's knowledge base. */
  loadKnowledge: () => Promise<KnowledgeBase>;
};

/**
 * REGISTER WEBSITES HERE. To add a website: create src/assistant-sites/<id>/
 * (see docs/T6_INTEGRATION_GUIDE.md) and add it to this list.
 */
const SITES: AssistantSiteDefinition[] = [demoSpiceSite];

const byId = new Map(SITES.map((s) => [s.id, s]));
const knowledgeCache = new Map<string, Promise<KnowledgeBase>>();

export function getSite(id: string): AssistantSiteDefinition | undefined {
  return byId.get(id);
}

/** Loads a site's knowledge once per server instance (cached; retried after a failure). */
export function getKnowledge(site: AssistantSiteDefinition): Promise<KnowledgeBase> {
  let promise = knowledgeCache.get(site.id);
  if (!promise) {
    promise = site.loadKnowledge().catch((error) => {
      knowledgeCache.delete(site.id);
      throw error;
    });
    knowledgeCache.set(site.id, promise);
  }
  return promise;
}
