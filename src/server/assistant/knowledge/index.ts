import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createKeywordRetriever } from "@/server/assistant/knowledge/keyword-retriever";
import { chunksFromConfig, chunksFromMarkdown } from "@/server/assistant/knowledge/loaders";
import type {
  KnowledgeBase,
  KnowledgeChunk,
  WebsiteKnowledgeConfig,
} from "@/server/assistant/knowledge/types";

/** Root folder for Markdown knowledge files: content/assistant/<folder>/*.md */
export const KNOWLEDGE_ROOT = path.join(process.cwd(), "content", "assistant");

/** Reads every `*.md` file in content/assistant/<folder>. Folder name must be a simple slug. */
export async function readMarkdownFolder(
  folder: string,
): Promise<Array<{ id: string; markdown: string }>> {
  if (!/^[a-z0-9-]+$/.test(folder)) throw new Error(`Invalid knowledge folder: ${folder}`);
  const dir = path.join(KNOWLEDGE_ROOT, folder);
  const names = (await readdir(dir)).filter((n) => n.endsWith(".md")).sort();
  return Promise.all(
    names.map(async (name) => ({
      id: name.replace(/\.md$/, ""),
      markdown: await readFile(path.join(dir, name), "utf8"),
    })),
  );
}

/** Reads one Markdown knowledge file (e.g. to render it as a website page). */
export async function readMarkdownFile(folder: string, id: string): Promise<string> {
  if (!/^[a-z0-9-]+$/.test(folder) || !/^[a-z0-9-]+$/.test(id)) {
    throw new Error("Invalid knowledge file name");
  }
  return readFile(path.join(KNOWLEDGE_ROOT, folder, `${id}.md`), "utf8");
}

export function buildKnowledgeBase(input: {
  config: WebsiteKnowledgeConfig;
  markdown?: Array<{ id: string; markdown: string }>;
  extraChunks?: KnowledgeChunk[];
}): KnowledgeBase {
  const chunks = [
    ...chunksFromConfig(input.config),
    ...(input.markdown ?? []).flatMap((f) => chunksFromMarkdown(f.id, f.markdown)),
    ...(input.extraChunks ?? []),
  ];
  const ids = new Set<string>();
  for (const c of chunks) {
    if (ids.has(c.id)) throw new Error(`Duplicate knowledge chunk id: ${c.id}`);
    ids.add(c.id);
  }
  const catalog = [
    ...(input.config.products ?? []).map((p) => (p.price ? `${p.name} (${p.price})` : p.name)),
    ...(input.config.services ?? []).map((s) => `${s.name} (service)`),
  ];
  return {
    identity: input.config.identity,
    chunks,
    retriever: createKeywordRetriever(chunks),
    catalog,
  };
}

export type {
  KnowledgeBase,
  KnowledgeChunk,
  Retriever,
  WebsiteKnowledgeConfig,
} from "@/server/assistant/knowledge/types";
