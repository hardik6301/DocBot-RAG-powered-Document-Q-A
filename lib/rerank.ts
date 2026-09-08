import { GoogleGenerativeAI } from "@google/generative-ai";

const RERANK_MODELS = [
  process.env.GEMINI_CHAT_MODEL?.trim(),
  "gemini-flash-latest",
  "gemini-2.0-flash",
  "gemini-flash-lite-latest",
].filter(Boolean) as string[];

export type RerankCandidate = {
  chunkText: string;
  page: number | null;
  filename: string;
  score?: number;
  docId?: string;
  id?: string;
};

function getClient() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("GEMINI_API_KEY is missing");
  return new GoogleGenerativeAI(key);
}

async function generateText(prompt: string): Promise<string> {
  const genAI = getClient();
  let lastError: unknown;
  for (const modelName of RERANK_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
      } catch (e) {
        lastError = e;
        const msg = e instanceof Error ? e.message : String(e);
        const retryable = /429|503|quota|high demand|UNAVAILABLE/i.test(msg);
        const tryNext = /404|not found/i.test(msg) || (retryable && attempt >= 2);
        if (retryable && attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        if (tryNext) break;
        throw e;
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Rerank generation failed");
}

function parseRankedIds(raw: string, n: number): number[] {
  const jsonMatch = raw.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) return [];
  try {
    const arr = JSON.parse(jsonMatch[0]) as unknown;
    if (!Array.isArray(arr)) return [];
    const ids = arr
      .map((x) => Number(x))
      .filter((x) => Number.isInteger(x) && x >= 1 && x <= n);
    // dedupe preserving order
    const seen = new Set<number>();
    const out: number[] = [];
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Gemini relevance rerank: take Pinecone candidates, return top `keep` by
 * question relevance. Falls back to original order on parse/API failure.
 */
export async function rerankChunks<T extends RerankCandidate>(
  question: string,
  candidates: T[],
  keep = 5,
): Promise<T[]> {
  if (candidates.length <= keep) return candidates;
  if (candidates.length === 0) return [];

  const blocks = candidates
    .map((c, i) => {
      const head = `[${i + 1}] (${c.filename}${c.page != null ? `, page ${c.page}` : ""})`;
      const body = c.chunkText.replace(/\s+/g, " ").trim().slice(0, 1200);
      return `${head}\n${body}`;
    })
    .join("\n\n");

  const prompt = `You rank document chunks for retrieval relevance.

QUESTION:
${question}

CHUNKS:
${blocks}

Return ONLY a JSON array of chunk numbers (1-based), ordered from most relevant to least relevant.
Include every chunk number exactly once. Example: [3,1,2,5,4]
No markdown, no explanation.`;

  try {
    const raw = await generateText(prompt);
    const ranked = parseRankedIds(raw, candidates.length);
    if (ranked.length === 0) return candidates.slice(0, keep);

    const picked: T[] = [];
    const used = new Set<number>();
    for (const id of ranked) {
      if (picked.length >= keep) break;
      const idx = id - 1;
      if (used.has(idx)) continue;
      used.add(idx);
      picked.push(candidates[idx]);
    }
    // fill if model omitted some
    for (let i = 0; i < candidates.length && picked.length < keep; i++) {
      if (used.has(i)) continue;
      picked.push(candidates[i]);
    }
    return picked;
  } catch (e) {
    console.warn(
      "rerank failed; using Pinecone order",
      e instanceof Error ? e.message : e,
    );
    return candidates.slice(0, keep);
  }
}

/** Default retrieve pool before rerank (Phase 8.3). */
export const RETRIEVE_TOP_K = 15;
/** Chunks passed to grounded generation after rerank. */
export const RERANK_KEEP = 5;
