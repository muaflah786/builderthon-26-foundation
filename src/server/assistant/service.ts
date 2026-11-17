import "server-only";

import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import type { ChatRequest } from "@/lib/assistant/schema";
import type { ChatStreamEvent } from "@/lib/assistant/types";
import {
  buildMessages,
  retrievalText,
  selectContext,
  toSources,
  trimHistory,
} from "@/server/assistant/prompt";
import { ProviderError, resolveProvider, type AiProvider } from "@/server/assistant/providers";
import { getKnowledge, getSite } from "@/server/assistant/sites";
import { logger } from "@/server/logger";

/** Visitor-safe messages for provider failures (internal details go to logs only). */
export const PROVIDER_ERROR_MESSAGES: Record<ProviderError["kind"], string> = {
  not_configured: "The assistant is not set up yet. Please try again later.",
  unavailable: "The AI service is unavailable right now. Please try again in a moment.",
  timeout: "The assistant took too long to answer. Please try again.",
  rate_limited: "The AI service is busy right now. Please try again in a minute.",
  quota: "The assistant has reached its usage limit for now. Please try again later.",
  auth: "The assistant could not answer right now.",
  bad_response: "The assistant could not answer right now. Please try again.",
};

export type PreparedChat = {
  provider: AiProvider;
  events: AsyncGenerator<ChatStreamEvent>;
};

/**
 * Validates the site + provider, retrieves knowledge and returns a generator of
 * stream events. Errors BEFORE streaming throw AppError (→ JSON envelope);
 * errors DURING streaming become a final `error` event.
 */
export async function prepareChat(
  request: ChatRequest,
  signal: AbortSignal,
  getProvider = resolveProvider,
): Promise<PreparedChat> {
  const site = getSite(request.siteId);
  if (!site) throw AppError.notFound("Assistant site");

  const resolution = getProvider(site.preferredProvider);
  if (resolution.status !== "ready") {
    logger.warn("assistant not configured", { siteId: site.id, reason: resolution.reason });
    throw new AppError("SERVICE_UNAVAILABLE", PROVIDER_ERROR_MESSAGES.not_configured);
  }
  const provider = resolution.provider;

  const knowledge = await getKnowledge(site);
  const history = trimHistory(request.history);
  const results = knowledge.retriever.search({
    text: retrievalText(request.message, history),
    pagePath: request.page?.path,
    limit: site.retrievalLimit ?? 5,
  });
  const selected = selectContext(results);
  const messages = buildMessages({
    assistantName: site.assistantName,
    knowledge,
    siteInstructions: site.instructions,
    selected,
    page: request.page,
    history,
    message: request.message,
  });

  async function* events(): AsyncGenerator<ChatStreamEvent> {
    const started = Date.now();
    let chars = 0;
    yield {
      type: "meta",
      sources: toSources(selected),
      provider: provider.id,
      model: provider.model,
    };
    try {
      for await (const text of provider.stream({
        messages,
        maxOutputTokens: site!.maxOutputTokens ?? env.AI_MAX_OUTPUT_TOKENS,
        signal,
      })) {
        chars += text.length;
        yield { type: "delta", text };
      }
      if (chars === 0) {
        throw new ProviderError(provider.id, "bad_response", "empty answer");
      }
      yield { type: "done" };
      // Metadata only: never log conversation content.
      logger.info("assistant answered", {
        siteId: site!.id,
        provider: provider.id,
        model: provider.model,
        ms: Date.now() - started,
        answerChars: chars,
        sources: selected.length,
        historyTurns: history.length,
      });
    } catch (error) {
      const kind = error instanceof ProviderError ? error.kind : "bad_response";
      logger.error("assistant failed", {
        siteId: site!.id,
        provider: provider.id,
        model: provider.model,
        kind,
        ms: Date.now() - started,
        error: error instanceof ProviderError ? error.message : String(error),
      });
      yield { type: "error", code: kind, message: PROVIDER_ERROR_MESSAGES[kind] };
    }
  }

  return { provider, events: events() };
}
