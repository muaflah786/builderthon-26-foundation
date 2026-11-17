/**
 * App identity — the FIRST file to edit when the competition problem arrives.
 * Navigation items are added here by feature modules (see docs/MODULE_CONTRACTS.md).
 * Foundation demos (/app/items, /demo) still work by URL but are not in the product nav.
 */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "Universal Ops",
  description: "One platform. Every situation. Organize a one-day operation in minutes.",
  /** Top-level navigation. `auth: true` items are shown only to signed-in users. */
  nav: [
    { href: "/", label: "Home", auth: false },
    { href: "/app", label: "Operations", auth: true },
  ] as Array<{
    href: string;
    label: string;
    auth: boolean;
  }>,
} as const;
