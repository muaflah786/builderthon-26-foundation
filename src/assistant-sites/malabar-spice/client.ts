import type { AssistantClientConfig } from "@/lib/assistant/types";

/** Browser-safe widget configuration for the demo website. */
export const malabarSpiceAssistant: AssistantClientConfig = {
  siteId: "malabar-spice",
  assistantName: "Mira",
  welcomeMessage:
    "Hi! I'm Mira, the Malabar Spice Market assistant. Ask me about our spices, prices, delivery or returns — or any cooking question. നിങ്ങൾക്ക് മലയാളത്തിലും ചോദിക്കാം.",
  suggestedQuestions: [
    "What is your return policy?",
    "Which spices are good for biryani?",
    "How long does delivery to Kerala take?",
    "കുരുമുളകിന്റെ വില എത്രയാണ്?",
  ],
  inputPlaceholder: "Ask about spices, orders, delivery…",
  locale: "en",
  pageContext: true,
  persistConversation: true,
  theme: { position: "bottom-right" },
};
