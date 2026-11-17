import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AssistantWidget } from "@/components/assistant";
import { DEMO_PAGES, DEMO_SITE } from "@/assistant-sites/malabar-spice/catalog";
import { malabarSpiceAssistant } from "@/assistant-sites/malabar-spice/client";

export const metadata: Metadata = {
  title: { default: DEMO_SITE.name, template: `%s · ${DEMO_SITE.name}` },
  description: DEMO_SITE.tagline,
};

/**
 * DEMO WEBSITE (T6): a small e-commerce site showing how any website embeds
 * the assistant: one line, <AssistantWidget config={...} />.
 */
export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-border bg-muted/40 border-b">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/demo" className="text-lg font-semibold tracking-tight">
            🌶️ {DEMO_SITE.name}
          </Link>
          <nav aria-label="Shop" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {DEMO_PAGES.filter((p) => p.path !== "/demo").map((p) => (
              <Link
                key={p.path}
                href={p.path}
                className="text-muted-foreground hover:text-foreground"
              >
                {p.title}
              </Link>
            ))}
          </nav>
          <span className="text-muted-foreground ml-auto text-xs">Demo shop · no real orders</span>
        </div>
      </div>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</div>
      <AssistantWidget config={malabarSpiceAssistant} />
    </div>
  );
}
