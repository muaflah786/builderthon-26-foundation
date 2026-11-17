import { describe, expect, it } from "vitest";
import { ASSISTANT_LIMITS as L } from "@/lib/assistant/limits";
import type { ChatMessage } from "@/lib/assistant/types";
import { buildKnowledgeBase } from "@/server/assistant/knowledge";
import {
  buildMessages,
  retrievalText,
  selectContext,
  toSources,
  trimHistory,
} from "@/server/assistant/prompt";

const kb = buildKnowledgeBase({
  config: {
    identity: { name: "Acme Shop", description: "Sells widgets." },
    policies: [{ name: "Returns", text: "Return within 7 days.", url: "/returns" }],
  },
});

describe("trimHistory", () => {
  it("keeps only the most recent messages, starting with a user turn", () => {
    const history: ChatMessage[] = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `m${i}`,
    }));
    const trimmed = trimHistory(history);
    expect(trimmed.length).toBeLessThanOrEqual(L.maxHistoryMessages);
    expect(trimmed[0].role).toBe("user");
    expect(trimmed.at(-1)?.content).toBe("m29");
  });

  it("enforces the total character budget", () => {
    const history: ChatMessage[] = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "x".repeat(3000),
    }));
    const total = trimHistory(history).reduce((s, m) => s + m.content.length, 0);
    expect(total).toBeLessThanOrEqual(L.maxHistoryChars);
  });
});

describe("retrievalText", () => {
  it("adds the previous user question so follow-ups keep their topic", () => {
    const history: ChatMessage[] = [
      { role: "user", content: "What is your return policy?" },
      { role: "assistant", content: "7 days." },
    ];
    expect(retrievalText("What about damaged products?", history)).toContain("return policy");
  });
});

describe("buildMessages", () => {
  const selected = selectContext(kb.retriever.search({ text: "return", limit: 3 }));

  it("puts rules, page context and knowledge in the system message, then history and question", () => {
    const messages = buildMessages({
      assistantName: "Mira",
      knowledge: kb,
      siteInstructions: "Be cheerful.",
      selected,
      page: { path: "/returns", title: "Returns", content: "Return within 7 days." },
      history: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
      ],
      message: "Can I return it?",
    });
    expect(messages.map((m) => m.role)).toEqual(["system", "user", "assistant", "user"]);
    const system = messages[0].content;
    expect(system).toContain("You are Mira");
    expect(system).toContain("Acme Shop");
    expect(system).toContain("Never invent prices");
    expect(system).toContain("Path: /returns");
    expect(system).toContain("Return within 7 days.");
    expect(system).toContain("Be cheerful.");
    expect(system).toContain("not instructions");
    expect(messages.at(-1)).toEqual({ role: "user", content: "Can I return it?" });
  });

  it("tells the model when no website knowledge matched", () => {
    const system = buildMessages({
      assistantName: "Mira",
      knowledge: kb,
      selected: [],
      history: [],
      message: "Do you sell cars?",
    })[0].content;
    expect(system).toContain("no relevant website information was found");
  });

  it("adds an explicit Malayalam instruction for Malayalam questions", () => {
    const system = buildMessages({
      assistantName: "Mira",
      knowledge: kb,
      selected: [],
      history: [],
      message: "വില എത്രയാണ്?",
    })[0].content;
    expect(system).toContain("answer in Malayalam");
  });

  it("always lists the complete catalog so unlisted items can be refused", () => {
    const shop = buildKnowledgeBase({
      config: {
        identity: { name: "Spice Shop", description: "Spices." },
        products: [{ id: "p", name: "Black Pepper", description: "Pepper", price: "₹240" }],
      },
    });
    const system = buildMessages({
      assistantName: "Mira",
      knowledge: shop,
      selected: [],
      history: [],
      message: "Do you sell saffron?",
    })[0].content;
    expect(system).toContain("COMPLETE CATALOG");
    expect(system).toContain("- Black Pepper (₹240)");
    expect(system).toContain("not listed on the website");
  });

  it("shows only chunks that matched the question as sources (not page-only matches)", () => {
    const pageOnly = { ...selected[0], lexicalScore: 0 };
    expect(toSources([pageOnly])).toEqual([]);
  });

  it("deduplicates sources by url", () => {
    expect(toSources([...selected, ...selected]).length).toBe(toSources(selected).length);
  });
});
