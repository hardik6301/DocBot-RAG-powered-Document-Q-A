import { GoogleGenerativeAI } from "@google/generative-ai";

function getClient() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add it to .env.local to enable embeddings and chat.",
    );
  }
  return new GoogleGenerativeAI(key);
}

/** Gemini text-embedding-004 → 768 dimensions (matches Architecture). */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

  const vectors: number[][] = [];
  const batchSize = 16;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (text) => {
        const cleaned = text.replace(/\s+/g, " ").trim().slice(0, 8000);
        const res = await model.embedContent(cleaned || " ");
        const values = res.embedding?.values;
        if (!values?.length) {
          throw new Error("Gemini returned an empty embedding");
        }
        return values;
      }),
    );
    vectors.push(...results);
  }

  return vectors;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [v] = await embedTexts([text]);
  return v;
}

export async function generateGroundedAnswer(
  question: string,
  contextBlocks: { text: string; page: number | null; filename: string }[],
): Promise<string> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}
