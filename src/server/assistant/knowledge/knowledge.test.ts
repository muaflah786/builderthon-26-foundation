import { describe, expect, it } from "vitest";
import { buildKnowledgeBase, readMarkdownFolder } from "@/server/assistant/knowledge";
import { chunksFromConfig, chunksFromMarkdown } from "@/server/assistant/knowledge/loaders";
import { containsMalayalam, stem, tokenize } from "@/server/assistant/knowledge/text";
import { malabarSpiceKnowledge } from "@/assistant-sites/malabar-spice/knowledge";

const ids = (results: Array<{ chunk: { id: string } }>) => results.map((r) => r.chunk.id);

describe("text processing", () => {
  it("tokenizes English with stopwords removed and light stemming", () => {
    expect(tokenize("What are the Delivery charges for orders?")).toEqual([
      "delivery",
      "charg",
      "order",
    ]);
    expect(stem("policies")).toBe("policy");
  });

  it("keeps Malayalam words intact and strips case endings so inflected forms match", () => {
    // "of pepper" (genitive) and "pepper" reduce to the same stem.
    expect(tokenize("കുരുമുളകിന്റെ വില?")).toEqual(tokenize("കുരുമുളക് വില"));
    expect(tokenize("ഏലക്കായയുടെ")).toEqual(tokenize("ഏലക്കായ"));
    expect(tokenize("മഞ്ഞൾപ്പൊടി")).toEqual(["മഞ്ഞൾപ്പൊടി"]);
    expect(containsMalayalam("price of കുരുമുളക്")).toBe(true);
    expect(containsMalayalam("price")).toBe(false);
  });
});

describe("loaders", () => {
  it("converts structured config into typed chunks", () => {
    const chunks = chunksFromConfig({
      identity: { name: "Acme", description: "Widgets" },
      products: [{ id: "w1", name: "Widget", description: "A widget", price: "$5" }],
      faqs: [{ question: "Do you ship?", answer: "Yes" }],
      contact: { text: "mail@acme.test" },
    });
    expect(chunks.map((c) => c.kind)).toEqual(["overview", "product", "faq", "contact"]);
    expect(chunks[1].text).toContain("Price: $5");
  });

  it("splits Markdown into one chunk per ## section with front matter", () => {
    const md =
      "---\ntitle: Returns\nurl: /returns\nkind: policy\ntags: refund\n---\nIntro text.\n## Damaged items\nSend a photo.";
    const chunks = chunksFromMarkdown("returns", md);
    expect(chunks).toHaveLength(2);
    expect(chunks[1]).toMatchObject({
      id: "returns#damaged-items",
      kind: "policy",
      title: "Returns: Damaged items",
      url: "/returns#damaged-items",
      tags: ["refund"],
    });
  });

  it("rejects duplicate chunk ids", () => {
    expect(() =>
      buildKnowledgeBase({
        config: { identity: { name: "A", description: "B" } },
        markdown: [
          { id: "x", markdown: "a" },
          { id: "x", markdown: "b" },
        ],
      }),
    ).toThrow(/Duplicate/);
  });
});

describe("demo website knowledge retrieval", async () => {
  const kb = buildKnowledgeBase({
    config: malabarSpiceKnowledge,
    markdown: await readMarkdownFolder("malabar-spice"),
  });
  const search = (text: string, pagePath?: string) =>
    kb.retriever.search({ text, pagePath, limit: 5 });

  it("loads structured + Markdown knowledge", () => {
    expect(kb.chunks.length).toBeGreaterThan(25);
    expect(kb.identity.name).toBe("Malabar Spice Market");
  });

  it("finds the return policy for a returns question", () => {
    // The file intro (titled "Shipping & returns") may rank first; the specific
    // section must be in the top 2, above unrelated sections like "Shipping charges".
    const top = ids(search("What is your return policy?"));
    expect(top.slice(0, 2)).toContain("shipping-returns#returns-and-refunds");
    expect(top.indexOf("shipping-returns#returns-and-refunds")).toBeLessThan(
      top.indexOf("shipping-returns#shipping-charges") === -1
        ? 99
        : top.indexOf("shipping-returns#shipping-charges"),
    );
  });

  it("finds damaged-item rules for a damaged-products question", () => {
    expect(ids(search("my parcel arrived damaged")).slice(0, 2)).toContain(
      "shipping-returns#damaged-or-wrong-items",
    );
  });

  it("finds products by use (biryani) and by Malayalam name", () => {
    expect(ids(search("Which spices are good for biryani?"))).toContain("product:garam-masala");
    expect(ids(search("കുരുമുളക്"))[0]).toBe("product:black-pepper");
    // Inflected Malayalam question ("What is the price of pepper?")
    expect(ids(search("കുരുമുളകിന്റെ വില എത്രയാണ്?"))[0]).toBe("product:black-pepper");
  });

  it("boosts the page the visitor is on", () => {
    expect(ids(search("how much is this", "/demo/products/green-cardamom"))[0]).toBe(
      "product:green-cardamom",
    );
  });

  it("returns nothing for unrelated questions (no forced grounding)", () => {
    expect(search("Who painted the Mona Lisa?")).toEqual([]);
  });

  it("reads only safe folder names", async () => {
    await expect(readMarkdownFolder("../secrets")).rejects.toThrow(/Invalid/);
  });
});
