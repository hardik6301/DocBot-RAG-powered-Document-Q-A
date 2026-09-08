import { GoogleGenerativeAI } from "@google/generative-ai";

const CONTEXT_MODELS = [
  process.env.GEMINI_CHAT_MODEL?.trim(),
  "gemini-flash-latest",
  "gemini-2.0-flash",
  "gemini-flash-lite-latest",
].filter(Boolean) as string[];

function getClient() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY is missing");
  }
  return new GoogleGenerativeAI(key);
}

async function generateText(prompt: string): Promise<string> {
  const genAI = getClient();
  let lastError: unknown;
  for (const modelName of CONTEXT_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
      } catch (e) {
        lastError = e;
        const msg = e instanceof Error ? e.message : String(e);
        const retryable =
          /429|503|quota|high demand|UNAVAILABLE/i.test(msg);
        const tryNext =
          /404|not found/i.test(msg) || (retryable && attempt >= 2);
        if (retryable && attempt < 2) {
          await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
          continue;
        }
        if (tryNext) break;
        throw e;
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Contextual prefix generation failed");
}

/**
 * Anthropic-style contextual retrieval: short situating prefix per chunk.
 * Original chunk text is preserved separately for citations.
 */
export async function buildContextualTexts(opts: {
  filename: string;
  /** Whole-doc preview for situating chunks (truncated). */
  documentPreview: string;
  chunks: { text: string; page: number; index: number }[];
}): Promise<string[]> {
  const preview = opts.documentPreview.replace(/\s+/g, " ").trim().slice(0, 6000);
  const out: string[] = [];

  // Small concurrency to limit Gemini rate limits during ingest.
  const concurrency = 3;
  for (let i = 0; i < opts.chunks.length; i += concurrency) {
    const batch = opts.chunks.slice(i, i + concurrency);
    const prefixes = await Promise.all(
      batch.map(async (chunk) => {
        const prompt = `You are indexing a document for search.
Document filename: ${opts.filename}
Document preview:
"""
${preview}
"""

Chunk (page ${chunk.page}):
"""
${chunk.text.slice(0, 2500)}
"""

Write ONE short paragraph (2 sentences max) that situates this chunk within the document so it can be retrieved independently.
Include the document type/topic and what this chunk is about.
Do NOT repeat the chunk verbatim. Answer with only the situating context.`;

        try {
          const prefix = await generateText(prompt);
          return prefix.replace(/\s+/g, " ").trim().slice(0, 500);
        } catch (e) {
          console.warn(
            "contextual prefix failed; embedding raw chunk",
            e instanceof Error ? e.message : e,
          );
          return "";
        }
      }),
    );

    for (let j = 0; j < batch.length; j++) {
      const prefix = prefixes[j];
      const original = batch[j].text;
      out.push(prefix ? `${prefix}\n\n${original}` : original);
    }
  }

  return out;
}

/** Build a cheap doc preview from loaded pages (no extra LLM call). */
export function documentPreviewFromPages(
  pages: { page: number; text: string }[],
  maxChars = 6000,
): string {
  const joined = pages
    .map((p) => `Page ${p.page}: ${p.text.replace(/\s+/g, " ").trim()}`)
    .join("\n\n");
  return joined.slice(0, maxChars);
}
