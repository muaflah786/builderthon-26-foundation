import type { Metadata } from "next";
import { SignOutButton } from "@/app/(auth)/_components/sign-out-button";
import { AppShell } from "@/components/layout/app-shell";
import { ToastProvider } from "@/components/ui/toast";
import { siteConfig } from "@/config/site";
import { getSessionUser } from "@/server/auth/session";
import "./globals.css";

// System font stack (see globals.css) — no build-time font download, so builds work offline.
export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    title: `${siteConfig.name}: One platform. Every situation.`,
    description: siteConfig.description,
    siteName: siteConfig.name,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${siteConfig.name}: One platform. Every situation.`,
    description: siteConfig.description,
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Reading the session makes every page dynamic. That is intended: the header
  // always shows the real signed-in state. getSessionUser is cached per request.
  const user = await getSessionUser();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <ToastProvider>
          <AppShell user={user} nav={siteConfig.nav} userMenu={user ? <SignOutButton /> : null}>
            {children}
          </AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
