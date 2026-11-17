/**
 * Provider-independent AI interface. The chat service only talks to `AiProvider`,
 * so a new model provider = one new adapter file + one line in ./index.ts.
 */

export type ProviderId = "ollama" | "openrouter" | "gemini";

export type ProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateRequest = {
  /** Full conversation: system instructions first, then alternating turns. */
  messages: ProviderMessage[];
  maxOutputTokens: number;
  temperature?: number;
  /** Aborted when the visitor disconnects or the overall timeout fires. */
  signal: AbortSignal;
};

export type ProviderHealth = {
  ok: boolean;
  provider: ProviderId;
  model: string;
  /** Safe, human-readable detail (never contains secrets). */
  detail: string;
};

export interface AiProvider {
  readonly id: ProviderId;
  readonly model: string;
  /** Yields answer text pieces as they arrive. Throws ProviderError on failure. */
  stream(request: GenerateRequest): AsyncIterable<string>;
  /** Cheap check that the provider is reachable and the model is usable. */
  health(signal?: AbortSignal): Promise<ProviderHealth>;
}

export type ProviderErrorKind =
  "not_configured" | "unavailable" | "timeout" | "rate_limited" | "auth" | "quota" | "bad_response";

/** Failure from a model provider. `message` is internal; never send it to visitors. */
export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;
  readonly provider: ProviderId;
  readonly status?: number;

  constructor(provider: ProviderId, kind: ProviderErrorKind, message: string, status?: number) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.kind = kind;
    this.status = status;
  }
}
