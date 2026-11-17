import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertRateLimit,
  clientIp,
  rateLimit,
  resetRateLimits,
} from "@/server/security/rate-limit";

beforeEach(() => {
  vi.useFakeTimers();
  resetRateLimits();
});
afterEach(() => vi.useRealTimers());

describe("rateLimit", () => {
  it("allows up to the limit, then blocks until the window resets", () => {
    const opts = { key: "k", limit: 2, windowMs: 1000 };
    expect(rateLimit(opts)).toMatchObject({ success: true, remaining: 1 });
    expect(rateLimit(opts)).toMatchObject({ success: true, remaining: 0 });
    expect(rateLimit(opts).success).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(rateLimit(opts).success).toBe(true);
  });

  it("tracks keys independently", () => {
    rateLimit({ key: "a", limit: 1, windowMs: 1000 });
    expect(rateLimit({ key: "b", limit: 1, windowMs: 1000 }).success).toBe(true);
  });

  it("assertRateLimit throws RATE_LIMITED", () => {
    const opts = { key: "x", limit: 1, windowMs: 1000 };
    assertRateLimit(opts);
    expect(() => assertRateLimit(opts)).toThrow(
      expect.objectContaining({ code: "RATE_LIMITED", status: 429 }),
    );
  });
});

describe("clientIp", () => {
  it("uses the first x-forwarded-for entry", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } });
    expect(clientIp(req)).toBe("1.2.3.4");
  });
  it("falls back to x-real-ip, then unknown", () => {
    expect(clientIp(new Request("http://x", { headers: { "x-real-ip": "5.6.7.8" } }))).toBe(
      "5.6.7.8",
    );
    expect(clientIp(new Request("http://x"))).toBe("unknown");
  });
});
