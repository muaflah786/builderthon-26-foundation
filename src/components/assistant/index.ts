/**
 * Public entry point of the Universal Website AI Assistant (browser side).
 *
 *   import { AssistantWidget } from "@/components/assistant";
 *   <AssistantWidget config={myAssistantConfig} />
 */
export { AssistantWidget } from "@/components/assistant/assistant-widget";
export { collectPageContext } from "@/components/assistant/page-context";
export { useAssistantChat } from "@/components/assistant/use-assistant-chat";
export type {
  AssistantClientConfig,
  ChatMessage,
  ChatStreamEvent,
  PageContext,
  SourceRef,
} from "@/lib/assistant/types";
