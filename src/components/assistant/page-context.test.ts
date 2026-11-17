// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { ASSISTANT_LIMITS as L } from "@/lib/assistant/limits";
import { collectPageContext } from "@/components/assistant/page-context";

const loc = (pathname: string) => ({ pathname }) as Location;

beforeEach(() => {
  document.head.innerHTML =
    '<title>Green Cardamom · Shop</title><meta name="description" content="Plump pods">';
  document.body.innerHTML = "";
});

describe("collectPageContext", () => {
  it("captures path, title and description", () => {
    expect(collectPageContext(document, loc("/demo/products/green-cardamom"))).toMatchObject({
      path: "/demo/products/green-cardamom",
      title: "Green Cardamom · Shop",
      description: "Plump pods",
    });
  });

  it("reads only regions marked data-assistant-context", () => {
    document.body.innerHTML =
      "<p>Private account balance ₹99,999</p><article data-assistant-context><h1>Cardamom</h1><p>₹420 for 100 g</p></article>";
    const ctx = collectPageContext(document, loc("/x"));
    expect(ctx.content).toContain("₹420 for 100 g");
    expect(ctx.content).not.toContain("99,999");
  });

  it("never reads form fields, passwords or opted-out content, even inside marked regions", () => {
    document.body.innerHTML = `
      <section data-assistant-context>
        <p>Public text</p>
        <input type="password" value="hunter2" />
        <textarea>my address</textarea>
        <div data-assistant-ignore>Card 4111 1111 1111 1111</div>
        <form><p>Checkout form text</p></form>
      </section>
      <form><div data-assistant-context>Inside a form</div></form>`;
    const content = collectPageContext(document, loc("/x")).content ?? "";
    expect(content).toContain("Public text");
    for (const secret of ["hunter2", "my address", "4111", "Checkout", "Inside a form"]) {
      expect(content).not.toContain(secret);
    }
  });

  it("never includes query strings or hashes", () => {
    expect(collectPageContext(document, { pathname: "/reset" } as Location).path).toBe("/reset");
  });

  it("enforces size limits", () => {
    document.title = "T".repeat(1000);
    document.body.innerHTML = `<div data-assistant-context>${"word ".repeat(2000)}</div>`;
    const ctx = collectPageContext(document, loc("/x"));
    expect(ctx.title!.length).toBe(L.maxTitleChars);
    expect(ctx.content!.length).toBeLessThanOrEqual(L.maxPageContentChars);
  });

  it("returns no content when nothing is marked", () => {
    document.body.innerHTML = "<p>hello</p>";
    expect(collectPageContext(document, loc("/x")).content).toBeUndefined();
  });
});
