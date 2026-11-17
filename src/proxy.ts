import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect only (docs/MODULE_CONTRACTS.md §Auth): checks that a session
 * cookie EXISTS, without touching the DB. Real authorization happens in services
 * and route handlers via `requireUser` / `requireRole`.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: ["/app", "/app/:path*"],
};
