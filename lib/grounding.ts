export const NOT_IN_DOCUMENT_ANSWER =
  "I couldn't find information about that in the uploaded document.";

/** Pinecone cosine floor after retrieve (before/after rerank). */
export const GROUNDING_SCORE_FLOOR = 0.22;

const STOP = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "what",
  "which",
  "who",
  "whom",
  "whose",
  "when",
  "where",
  "why",
  "how",
  "do",
  "does",
  "did",
  "can",
  "could",
  "should",
  "would",
  "will",
  "i",
  "me",
  "my",
  "we",
  "our",
  "you",
  "your",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "and",
  "or",
  "but",
  "if",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "from",
  "by",
  "about",
  "into",
  "over",
  "after",
  "before",
  "between",
  "not",
  "no",
  "yes",
]);

export function tokenizeQuestion(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9@.\-_/]+/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

export type ScoredChunk = {
  chunkText: string;
  page: number | null;
  filename: string;
  score?: number;
};

/**
 * Decide whether retrieved chunks are strong enough to answer.
 * Refuses weak / off-topic retrieval before generation when possible.
 */
export function assessGroundingSupport(
  question: string,
  chunks: ScoredChunk[],
): { ok: true } | { ok: false; reason: string } {
  if (!chunks.length) {
    return { ok: false, reason: "no_chunks" };
  }

  const best = Math.max(...chunks.map((c) => c.score ?? 0));
  if (best > 0 && best < GROUNDING_SCORE_FLOOR) {
    return { ok: false, reason: "low_similarity" };
  }

  const tokens = tokenizeQuestion(question);
  // Very short / generic questions: rely on similarity only.
  if (tokens.length >= 2) {
    const corpus = chunks
      .map((c) => c.chunkText.toLowerCase())
      .join("\n");
    const hits = tokens.filter((t) => corpus.includes(t));
    const coverage = hits.length / tokens.length;
    // Off-topic world-knowledge questions usually share almost no tokens
    // with a JD/policy doc (e.g. "capital of France").
    if (coverage < 0.15 && best < 0.45) {
      return { ok: false, reason: "lexical_mismatch" };
    }
  }

  return { ok: true };
}

export function groundingSystemRules(): string {
  return `You are DocBot, a document Q&A assistant.

STRICT RULES:
1. Answer ONLY using the CONTEXT blocks below. Do not use outside/world knowledge.
2. If CONTEXT does not contain enough information to answer, reply exactly:
"${NOT_IN_DOCUMENT_ANSWER}"
3. Do not guess, invent numbers, or fill gaps with general knowledge.
4. If the question is unrelated to the document topic, use the same not-found reply.
5. Cite supporting blocks inline like [1], [2] matching CONTEXT numbers. Only cite blocks you used.
6. Be concise and precise. Prefer quoting key facts from CONTEXT over paraphrasing when numbers/dates matter.`;
}
