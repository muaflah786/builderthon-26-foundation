import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";
import type { SessionUser } from "@/types/auth";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader, type NavItems } from "@/components/layout/site-header";

export type AppShellProps = {
  /** Current user, resolved by the caller (T2 never imports auth). */
  user: SessionUser | null;
  nav: NavItems;
  /** Signed-in controls such as a sign-out button. */
  userMenu?: ReactNode;
  children: ReactNode;
};

/**
 * Page frame: skip link, header with nav, `<main id="main">`, footer.
 *
 *   <AppShell user={await getSessionUser()} nav={siteConfig.nav} userMenu={<SignOutButton />}>
 *     {children}
 *   </AppShell>
 */
export function AppShell({ user, nav, userMenu, children }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <a
        href="#main"
        className="bg-primary text-primary-foreground sr-only rounded-md px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
      >
        Skip to content
      </a>
      <SiteHeader appName={siteConfig.name} user={user} nav={nav} userMenu={userMenu} />
      <main id="main" className="flex w-full flex-1 flex-col">
        {children}
      </main>
      <SiteFooter appName={siteConfig.name} />
    </div>
  );
}
