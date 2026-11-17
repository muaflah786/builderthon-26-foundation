import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "@/proxy";

const BASE = "http://localhost:3000";

describe("proxy", () => {
  it("redirects an unauthenticated /app/* visit to /sign-in with next", () => {
    const res = proxy(new NextRequest(`${BASE}/app/anything`));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${BASE}/sign-in?next=%2Fapp%2Fanything`);
  });

  it("keeps the query string in next", () => {
    const res = proxy(new NextRequest(`${BASE}/app/items?page=2`));
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/sign-in");
    expect(location.searchParams.get("next")).toBe("/app/items?page=2");
  });

  it("lets requests with a session cookie through", () => {
    const req = new NextRequest(`${BASE}/app/anything`, {
      headers: { cookie: "better-auth.session_token=abc.def" },
    });
    const res = proxy(req);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("only matches the /app area", () => {
    expect(config.matcher).toEqual(["/app", "/app/:path*"]);
  });
});
