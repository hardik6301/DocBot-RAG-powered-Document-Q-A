import { GoogleGenerativeAI } from "@google/generative-ai";

const EMBED_MODEL = "gemini-embedding-001";
/** Must match Pinecone index dimension in lib/pinecone.ts */
export const EMBED_DIM = 768;

function getApiKey() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add it to .env.local to enable embeddings and chat.",
    );
  }
  return key;
}

function getClient() {
  return new GoogleGenerativeAI(getApiKey());
}

function l2Normalize(values: number[]): number[] {
  let sum = 0;
  for (const v of values) sum += v * v;
  const norm = Math.sqrt(sum);
  if (!norm) return values;
  return values.map((v) => v / norm);
}

/**
 * Embed with gemini-embedding-001 (text-embedding-004 was shut down).
 * Requests 768-dim output so existing Pinecone indexes keep working.
 */
async function embedOne(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY",
): Promise<number[]> {
  const key = getApiKey();
  const cleaned = text.replace(/\s+/g, " ").trim().slice(0, 8000) || " ";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text: cleaned }] },
        taskType,
        outputDimensionality: EMBED_DIM,
      }),
    },
  );

  const data = (await res.json()) as {
    error?: { message?: string };
    embedding?: { values?: number[] };
  };

  if (!res.ok) {
    throw new Error(
      data.error?.message ||
        `Gemini embedding failed (${res.status}) for ${EMBED_MODEL}`,
    );
  }

  const values = data.embedding?.values;
  if (!values?.length) {
    throw new Error("Gemini returned an empty embedding");
  }

  // gemini-embedding-001: renormalize after dimension truncation
  const truncated =
    values.length > EMBED_DIM ? values.slice(0, EMBED_DIM) : values;
  return l2Normalize(truncated);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const vectors: number[][] = [];
  const batchSize = 8;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((text) => embedOne(text, "RETRIEVAL_DOCUMENT")),
    );
    vectors.push(...results);
  }

  return vectors;
}

export async function embedQuery(text: string): Promise<number[]> {
  return embedOne(text, "RETRIEVAL_QUERY");
}

const CHAT_MODELS = [
  process.env.GEMINI_CHAT_MODEL?.trim(),
  "gemini-flash-latest",
  "gemini-3-flash-preview",
  "gemini-flash-lite-latest",
].filter(Boolean) as string[];

export async function generateGroundedAnswer(
  question: string,
  contextBlocks: { text: string; page: number | null; filename: string }[],
): Promise<string> {
  const genAI = getClient();

  const context = contextBlocks
    .map(
      (c, i) =>
        `[${i + 1}] (${c.filename}${c.page != null ? `, page ${c.page}` : ""})\n${c.text}`,
    )
    .join("\n\n");

  const prompt = `You are DocBot, a document Q&A assistant. Answer ONLY using the context below.
If the context is insufficient, say you cannot find that information in the document.
Cite sources inline like [1], [2] matching the context block numbers.
Be concise and precise.

CONTEXT:
${context}

QUESTION:
${question}

ANSWER:`;

  let lastError: unknown;
  for (const modelName of CHAT_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (e) {
      lastError = e;
      const msg = e instanceof Error ? e.message : String(e);
      // Try next model on quota / not-found for this model
      if (
        msg.includes("429") ||
        msg.includes("404") ||
        msg.includes("not found") ||
        msg.includes("quota")
      ) {
        console.warn(`Gemini chat model ${modelName} failed, trying next…`, msg.slice(0, 120));
        continue;
      }
      throw e;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All Gemini chat models failed");
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}
