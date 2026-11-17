import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";

/**
 * Protected area: everything under /app requires a signed-in user.
 * proxy.ts already redirects when there is no session cookie; this is the real
 * check (an expired/revoked session still has a cookie).
 */
export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/app");
  return <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">{children}</div>;
}
