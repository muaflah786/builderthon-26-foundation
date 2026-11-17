import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createLocalStorage } from "@/server/storage/local";
import {
  UPLOAD_KEY_PATTERN,
  contentTypeForKey,
  isAllowedType,
  matchesMagicBytes,
  newUploadKey,
} from "@/server/storage/validation";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

describe("upload validation", () => {
  it("allow-lists types (no SVG, no HTML)", () => {
    expect(isAllowedType("image/png")).toBe(true);
    expect(isAllowedType("image/svg+xml")).toBe(false);
    expect(isAllowedType("text/html")).toBe(false);
    expect(isAllowedType("toString")).toBe(false);
  });

  it("checks magic bytes against the declared type", () => {
    expect(matchesMagicBytes("image/png", PNG)).toBe(true);
    expect(matchesMagicBytes("image/jpeg", PNG)).toBe(false);
    expect(matchesMagicBytes("application/pdf", new TextEncoder().encode("%PDF-1.7"))).toBe(true);
    expect(matchesMagicBytes("image/png", new TextEncoder().encode("<html>"))).toBe(false);
  });

  it("generates keys that match the serving pattern", () => {
    const key = newUploadKey("image/png");
    expect(key).toMatch(UPLOAD_KEY_PATTERN);
    expect(contentTypeForKey(key)).toBe("image/png");
  });

  it("rejects path traversal and foreign keys", () => {
    for (const bad of [
      "../.env.local",
      "a/../../x.png",
      "x.exe",
      "00000000-0000-0000-0000-000000000000.svg",
    ]) {
      expect(UPLOAD_KEY_PATTERN.test(bad)).toBe(false);
    }
  });
});

describe("local storage driver", () => {
  let root: string;
  beforeAll(async () => {
    root = await mkdtemp(path.join(tmpdir(), "bt-uploads-"));
  });
  afterAll(() => rm(root, { recursive: true, force: true }));

  it("puts, reads and deletes", async () => {
    const storage = createLocalStorage(root);
    const key = newUploadKey("image/png");
    await storage.put(key, PNG, "image/png");
    expect(await storage.read(key)).toEqual(PNG);
    expect(storage.getUrl(key)).toBe(`/api/uploads/${key}`);
    await storage.delete(key);
    expect(await storage.read(key)).toBeNull();
  });

  it("refuses keys outside the pattern", async () => {
    await expect(createLocalStorage(root).put("../evil.png", PNG, "image/png")).rejects.toThrow();
  });
});
