/**
 * App identity — the FIRST file to edit when the competition problem arrives.
 * Navigation items are added here by feature modules (see docs/MODULE_CONTRACTS.md).
 */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "Builderthon App",
  description: "A reusable full-stack foundation for DARUL HUDA SIBĀQ'26 Builderthon.",
  /** Top-level navigation. `auth: true` items are shown only to signed-in users. */
  nav: [{ href: "/", label: "Home", auth: false }] as Array<{
    href: string;
    label: string;
    auth: boolean;
  }>,
} as const;
