/**
 * App identity — the FIRST file to edit when the competition problem arrives.
 * Navigation items are added here by feature modules (see docs/MODULE_CONTRACTS.md).
 * Foundation demos (/app/items, /demo) still work by URL but are not in the product nav.
 */
export const siteConfig = {
  name: "ORDOX",
  description:
    "ORDOX: one platform for every situation. Set up, coordinate and close temporary operations in minutes, with zero training.",
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
