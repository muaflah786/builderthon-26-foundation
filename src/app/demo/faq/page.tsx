import type { Metadata } from "next";
import { readMarkdownFile } from "@/server/assistant/knowledge";
import { DEMO_FAQS } from "@/assistant-sites/malabar-spice/faqs";
import { Markdown } from "@/app/demo/_components/markdown";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about freshness, payment, shipping abroad, organic status, orders and storage.",
};

export default async function FaqPage() {
  const [ordering, storage] = await Promise.all([
    readMarkdownFile("malabar-spice", "ordering"),
    readMarkdownFile("malabar-spice", "storage"),
  ]);
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <h1 className="text-3xl font-semibold tracking-tight">Frequently asked questions</h1>
      <dl className="flex flex-col gap-5">
        {DEMO_FAQS.map((f) => (
          <div key={f.question}>
            <dt className="font-semibold">{f.question}</dt>
            <dd className="text-foreground/90 mt-1">{f.answer}</dd>
          </div>
        ))}
      </dl>
      <Markdown source={ordering} />
      <Markdown source={storage} />
    </div>
  );
}
