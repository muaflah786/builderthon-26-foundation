"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import type { siteConfig } from "@/config/site";
import type { SessionUser } from "@/types/auth";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Wordmark } from "@/components/layout/wordmark";

export type NavItems = typeof siteConfig.nav;

export type SiteHeaderProps = {
  appName: string;
  user: SessionUser | null;
  nav: NavItems;
  /** Signed-in controls (e.g. a sign-out button), wired up by the coordinator. */
  userMenu?: ReactNode;
};

/** Items visible to this user: `auth: true` items only when signed in. */
export function visibleNav(nav: NavItems, user: SessionUser | null) {
  return nav.filter((item) => !item.auth || user !== null);
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ appName, user, nav, userMenu }: SiteHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const items = visibleNav(nav, user);
  // Close the mobile menu after navigating (reset during render, no effect needed).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  const account = user ? (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-muted-foreground max-w-48 truncate text-sm" title={user.email}>
        {user.name || user.email}
      </span>
      {userMenu}
    </div>
  ) : (
    <div className="flex flex-wrap items-center gap-2">
      <Link href="/sign-in" className={buttonClasses({ variant: "ghost", size: "sm" })}>
        Sign in
      </Link>
      <Link href="/sign-up" className={buttonClasses({ variant: "primary", size: "sm" })}>
        Sign up
      </Link>
    </div>
  );

  const links = (layout: "row" | "column") => (
    <ul className={cn("flex gap-1", layout === "column" ? "flex-col" : "items-center")}>
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "hover:bg-muted block rounded-md px-3 py-2 text-sm font-medium",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <header className="border-border bg-background border-b">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label={`${appName} home`} className="flex items-center gap-2">
          <Wordmark name={appName} />
        </Link>
        <nav aria-label="Main" className="hidden flex-1 md:block">
          {links("row")}
        </nav>
        <div className="hidden md:block">{account}</div>
        <button
          type="button"
          className="text-foreground hover:bg-muted rounded-md p-2 md:hidden"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
            {menuOpen ? (
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>
      {menuOpen ? (
        <div id={menuId} className="border-border flex flex-col gap-3 border-t px-4 py-3 md:hidden">
          <nav aria-label="Main">{links("column")}</nav>
          {account}
        </div>
      ) : null}
    </header>
  );
}
