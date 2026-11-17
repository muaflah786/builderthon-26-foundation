import { tokenize } from "@/server/assistant/knowledge/text";
import type {
  KnowledgeChunk,
  RetrievalQuery,
  Retriever,
  ScoredChunk,
} from "@/server/assistant/knowledge/types";

/**
 * BM25 keyword retriever with title/tag boosting and current-page boosting.
 * Pure, in-memory and deterministic: good for websites with up to a few
 * thousand chunks, with no external services.
 */
export function createKeywordRetriever(
  chunks: KnowledgeChunk[],
  options: { k1?: number; b?: number; minScore?: number } = {},
): Retriever {
  const k1 = options.k1 ?? 1.4;
  const b = options.b ?? 0.75;
  const minScore = options.minScore ?? 0.5;

  // The most specific label (section heading, else title) counts three times;
  // the full title and the tags (often shared by every section of a file) count
  // once, so the section that is actually about the topic wins.
  const docs = chunks.map((chunk) => {
    const labelTokens = tokenize(chunk.section ?? chunk.title);
    const tokens = [
      ...tokenize(chunk.text),
      ...labelTokens,
      ...labelTokens,
      ...labelTokens,
      ...(chunk.section ? tokenize(chunk.title) : []),
      ...tokenize((chunk.tags ?? []).join(" ")),
    ];
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { chunk, tf, length: tokens.length, label: new Set(labelTokens) };
  });
  const avgLength = docs.reduce((sum, d) => sum + d.length, 0) / Math.max(1, docs.length);
  const df = new Map<string, number>();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const n = docs.length;
  const idf = (t: string) => {
    const f = df.get(t) ?? 0;
    return Math.log(1 + (n - f + 0.5) / (f + 0.5));
  };

  return {
    search({ text, pagePath, limit }: RetrievalQuery): ScoredChunk[] {
      const terms = [...new Set(tokenize(text))];
      const scored: ScoredChunk[] = [];
      for (const d of docs) {
        let score = 0;
        for (const t of terms) {
          const f = d.tf.get(t);
          if (!f) continue;
          score += idf(t) * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.length) / avgLength)));
          // Bonus when the term is in the chunk's own heading: a section titled
          // "Returns and refunds" beats a short section that merely mentions returns.
          if (d.label.has(t)) score += 0.75 * idf(t);
        }
        const onThisPage = pagePath && d.chunk.url && stripHash(d.chunk.url) === pagePath;
        const lexicalScore = score;
        if (onThisPage) score = score * 1.5 + 0.75;
        if (score >= minScore) scored.push({ chunk: d.chunk, score, lexicalScore });
      }
      return scored.sort((a, z) => z.score - a.score).slice(0, limit);
    },
  };
}

function stripHash(url: string): string {
  return url.split("#")[0].split("?")[0];
}
