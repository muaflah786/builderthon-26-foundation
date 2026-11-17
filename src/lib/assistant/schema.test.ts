import { describe, expect, it } from "vitest";
import { ASSISTANT_LIMITS as L } from "@/lib/assistant/limits";
import { chatRequestSchema, cleanText } from "@/lib/assistant/schema";

const base = { siteId: "malabar-spice", message: "Hello" };

describe("chatRequestSchema", () => {
  it("accepts a minimal request and defaults history", () => {
    expect(chatRequestSchema.parse(base)).toEqual({ ...base, history: [] });
  });

  it("rejects empty, whitespace-only and oversized messages", () => {
    expect(chatRequestSchema.safeParse({ ...base, message: "" }).success).toBe(false);
    expect(chatRequestSchema.safeParse({ ...base, message: "   \n " }).success).toBe(false);
    expect(
      chatRequestSchema.safeParse({ ...base, message: "x".repeat(L.maxMessageChars + 1) }).success,
    ).toBe(false);
  });

  it("rejects invalid site ids and roles", () => {
    expect(chatRequestSchema.safeParse({ ...base, siteId: "../etc" }).success).toBe(false);
    expect(
      chatRequestSchema.safeParse({ ...base, history: [{ role: "system", content: "x" }] }).success,
    ).toBe(false);
  });

  it("rejects too many history messages", () => {
    const history = Array.from({ length: 51 }, () => ({ role: "user", content: "hi" }));
    expect(chatRequestSchema.safeParse({ ...base, history }).success).toBe(false);
  });

  it("rejects page paths with query strings, hashes or no leading slash", () => {
    for (const path of ["/a?token=1", "/a#x", "https://evil.com/", "a/b"]) {
      expect(chatRequestSchema.safeParse({ ...base, page: { path } }).success).toBe(false);
    }
    expect(chatRequestSchema.safeParse({ ...base, page: { path: "/demo/faq" } }).success).toBe(
      true,
    );
  });

  it("keeps Malayalam text intact (NFC) and strips control characters", () => {
    const ml = "കുരുമുളകിന്റെ വില എത്രയാണ്?";
    expect(chatRequestSchema.parse({ ...base, message: ml }).message).toBe(ml.normalize("NFC"));
    expect(cleanText("he\u0000llo\u0007 ")).toBe("hello");
    expect(cleanText("line1\nline2")).toBe("line1\nline2");
  });
});
