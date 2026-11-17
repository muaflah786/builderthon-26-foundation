import type { Metadata } from "next";
import { readMarkdownFile } from "@/server/assistant/knowledge";
import { Markdown } from "@/app/demo/_components/markdown";

export const metadata: Metadata = {
  title: "About us",
  description: "Our story, how we source from Kerala farmers and how we pack.",
};

export default async function AboutPage() {
  const source = await readMarkdownFile("malabar-spice", "about");
  return (
    <article className="flex max-w-3xl flex-col gap-4" data-assistant-context>
      <h1 className="text-3xl font-semibold tracking-tight">About us</h1>
      <Markdown source={source} />
    </article>
  );
}
