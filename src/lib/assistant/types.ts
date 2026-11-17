/**
 * Universal Website AI Assistant: types shared by the browser widget and the server.
 * Nothing in this file may reference secrets or server-only modules.
 */

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

/** Non-sensitive description of the page the visitor is looking at. */
export type PageContext = {
  /** Path only, e.g. "/demo/products/black-pepper" (no query string, no hash). */
  path: string;
  title?: string;
  description?: string;
  /** Short public text the page explicitly marked with `data-assistant-context`. */
  content?: string;
};

/** A knowledge chunk the answer was grounded on, shown to the visitor as a source. */
export type SourceRef = {
  id: string;
  title: string;
  /** Page on the website where the visitor can read more, if any. */
  url?: string;
};

/**
 * Wire format of the streaming chat response (one JSON object per line, NDJSON).
 *   meta    → which sources were retrieved and which provider/model answers
 *   delta   → a piece of the answer text
 *   done    → the answer is complete
 *   error   → the request failed (safe, user-facing message)
 */
export type ChatStreamEvent =
  | { type: "meta"; sources: SourceRef[]; provider: string; model: string }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; code: string; message: string };

/** Public, browser-safe part of a website's assistant configuration. */
export type AssistantClientConfig = {
  /** Must match a site registered on the server (src/server/assistant/sites.ts). */
  siteId: string;
  assistantName: string;
  welcomeMessage: string;
  suggestedQuestions?: string[];
  /** Placeholder text for the input box. */
  inputPlaceholder?: string;
  /** Default language hint for the UI; the model replies in the visitor's language. */
  locale?: string;
  /** Capture page title/description/marked content with each question (default true). */
  pageContext?: boolean;
  /** Persist the conversation in sessionStorage across page navigations (default true). */
  persistConversation?: boolean;
  theme?: {
    /** Any CSS color; defaults to the design system's --primary. */
    accentColor?: string;
    /** Launcher position. */
    position?: "bottom-right" | "bottom-left";
  };
  /** API endpoint; defaults to "/api/assistant/chat" (same origin). */
  endpoint?: string;
};
