import { GoogleGenerativeAI } from "@google/generative-ai";

export type DocumentIntelligence = {
  summary: string;
  keyTopics: string[];
  suggestedQuestions: string[];
};

const MODELS = [
  process.env.GEMINI_CHAT_MODEL?.trim(),
  "gemini-flash-latest",
  "gemini-2.0-flash",
  "gemini-flash-lite-latest",
].filter(Boolean) as string[];

async function generateText(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("GEMINI_API_KEY is missing");
  const genAI = new GoogleGenerativeAI(key);
  let lastError: unknown;
  for (const modelName of MODELS) {
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
    : new Error("Document intelligence generation failed");
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced?.[1] ?? raw).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asStringArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => String(x ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, max);
}

/**
 * Phase 9 — generate summary, topics, suggested questions at ingest time.
 */
export async function analyzeDocumentIntelligence(opts: {
  filename: string;
  documentText: string;
}): Promise<DocumentIntelligence | null> {
  if (!process.env.GEMINI_API_KEY?.trim()) return null;

  const excerpt = opts.documentText.replace(/\s+/g, " ").trim().slice(0, 12000);
  if (!excerpt) return null;

  const prompt = `Analyze this document for a document-intelligence product.

Filename: ${opts.filename}

Document text:
"""
${excerpt}
"""

Return ONLY valid JSON (no markdown) with this shape:
{
  "summary": "2-4 sentence overview of what the document is and covers",
  "keyTopics": ["3-8 short topic labels"],
  "suggestedQuestions": ["4-6 natural questions a user might ask about this document"]
}

Rules:
- summary must be grounded in the text (no inventing employers/products not present)
- keyTopics are short noun phrases
- suggestedQuestions must be answerable from the document`;

  try {
    const raw = await generateText(prompt);
    const obj = parseJsonObject(raw);
    if (!obj) return null;
    const summary = String(obj.summary ?? "").replace(/\s+/g, " ").trim();
    const keyTopics = asStringArray(obj.keyTopics, 8);
    const suggestedQuestions = asStringArray(obj.suggestedQuestions, 6);
    if (!summary || keyTopics.length === 0 || suggestedQuestions.length === 0) {
      return null;
    }
    return { summary, keyTopics, suggestedQuestions };
  } catch (e) {
    console.warn(
      "document intelligence failed",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}
