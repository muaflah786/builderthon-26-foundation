import type { Metadata } from "next";
import { readMarkdownFile } from "@/server/assistant/knowledge";
import { Markdown } from "@/app/demo/_components/markdown";

export const metadata: Metadata = {
  title: "Shipping & returns",
  description: "Delivery times, shipping charges, returns, refunds and damaged items.",
};

/** Rendered from the same Markdown file the assistant uses as knowledge. */
export default async function ShippingReturnsPage() {
  const source = await readMarkdownFile("malabar-spice", "shipping-returns");
  return (
    <article className="flex max-w-3xl flex-col gap-4" data-assistant-context>
      <h1 className="text-3xl font-semibold tracking-tight">Shipping & returns</h1>
      <Markdown source={source} />
    </article>
  );
}
