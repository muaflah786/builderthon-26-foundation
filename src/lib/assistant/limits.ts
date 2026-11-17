/**
 * Hard limits for the public chat endpoint. Shared by client (to trim before
 * sending) and server (to reject anything larger).
 */
export const ASSISTANT_LIMITS = {
  /** Max characters in one visitor message. */
  maxMessageChars: 2000,
  /** Max messages of history sent per request (older ones are dropped). */
  maxHistoryMessages: 12,
  /** Max total characters across all history messages. */
  maxHistoryChars: 12000,
  /** Max characters of an assistant message kept in history. */
  maxAssistantMessageChars: 4000,
  /** Page context limits. */
  maxPathChars: 300,
  maxTitleChars: 200,
  maxDescriptionChars: 500,
  maxPageContentChars: 2000,
  /** Max JSON request body size in bytes. */
  maxBodyBytes: 64 * 1024,
} as const;
