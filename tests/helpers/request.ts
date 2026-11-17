/**
 * Helpers for calling Next.js route handlers directly in Vitest.
 *
 *   const res = await callRoute(POST, jsonRequest("POST", "/api/things", { title: "x" }));
 *   expect(res.status).toBe(201);
 *   expect(res.body).toMatchObject({ ok: true, data: { title: "x" } });
 *
 *   await callRoute(GET, jsonRequest("GET", "/api/things/abc"), { id: "abc" });
 */

const BASE = "http://localhost:3000";

export function jsonRequest(method: string, path: string, body?: unknown): Request {
  return new Request(new URL(path, BASE), {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

type RouteHandler<P> = (req: Request, ctx: { params: Promise<P> }) => unknown;

export type RouteResult = {
  status: number;
  headers: Headers;
  /** Parsed JSON body, or null for empty (e.g. 204) / non-JSON responses. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
};

export async function callRoute<P extends Record<string, string> = Record<string, string>>(
  handler: RouteHandler<P>,
  req: Request,
  params?: P,
): Promise<RouteResult> {
  const res = (await handler(req, { params: Promise.resolve(params ?? ({} as P)) })) as Response;
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, headers: res.headers, body };
}
