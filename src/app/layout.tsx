import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import "./globals.css";

// System font stack (see globals.css) — no build-time font download, so builds work offline.
export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
