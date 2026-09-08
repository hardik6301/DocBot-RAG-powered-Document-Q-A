import { GoogleGenerativeAI } from "@google/generative-ai";

export type CompareDocContext = {
  docId: string;
  filename: string;
  chunks: { text: string; page: number | null }[];
};

export type CompareTable = {
  headers: string[];
  rows: { aspect: string; values: string[] }[];
};

export type CompareResult = {
  table: CompareTable;
  differences: string;
  answer: string;
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
  throw lastError instanceof Error ? lastError : new Error("Compare generation failed");
}

function parseJson(raw: string): Record<string, unknown> | null {
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

/**
 * Structured multi-doc comparison from per-document retrieved chunks.
 * Does not merge namespaces — each doc's evidence stays labeled.
 */
export async function generateDocumentComparison(opts: {
  question: string;
  documents: CompareDocContext[];
}): Promise<CompareResult> {
  const labels = opts.documents.map((d, i) => {
    const letter = String.fromCharCode(65 + i);
    return { letter, ...d };
  });

  const context = labels
    .map((d) => {
      const chunks = d.chunks
        .map(
          (c, j) =>
            `  [${d.letter}${j + 1}] (page ${c.page ?? "?"})\n  ${c.text.slice(0, 1200)}`,
        )
        .join("\n\n");
      return `DOCUMENT ${d.letter}: ${d.filename} (id=${d.docId})\n${chunks || "  (no relevant chunks)"}`;
    })
    .join("\n\n");

  const headerNames = ["Aspect", ...labels.map((d) => `Doc ${d.letter}: ${d.filename}`)];

  const prompt = `You compare documents using ONLY the retrieved CONTEXT for each document.

QUESTION / COMPARISON FOCUS:
${opts.question}

CONTEXT (per document — do not mix claims across documents):
${context}

Return ONLY valid JSON:
{
  "table": {
    "headers": ${JSON.stringify(headerNames)},
    "rows": [
      { "aspect": "short aspect name", "values": ["value for Doc A", "value for Doc B", "..."] }
    ]
  },
  "differences": "1-3 paragraph narrative of key differences, citing like [A1], [B2]",
  "answer": "markdown table + Key Differences section for display"
}

Rules:
- values.length must equal number of documents (${labels.length})
- If a document has no evidence for an aspect, use "Not found in document"
- Never invent facts; cite chunk ids like [A1] in differences
- Include 4-8 comparison aspects when possible`;

  const raw = await generateText(prompt);
  const obj = parseJson(raw);
  if (!obj) {
    return {
      table: { headers: headerNames, rows: [] },
      differences: raw,
      answer: raw,
    };
  }

  const tableObj = (obj.table ?? {}) as Record<string, unknown>;
  const headers = Array.isArray(tableObj.headers)
    ? tableObj.headers.map((h) => String(h))
    : headerNames;
  const rowsRaw = Array.isArray(tableObj.rows) ? tableObj.rows : [];
  const rows = rowsRaw
    .map((r) => {
      const row = r as Record<string, unknown>;
      const values = Array.isArray(row.values)
        ? row.values.map((v) => String(v ?? ""))
        : [];
      while (values.length < labels.length) values.push("Not found in document");
      return {
        aspect: String(row.aspect ?? "Aspect"),
        values: values.slice(0, labels.length),
      };
    })
    .filter((r) => r.aspect);

  const differences = String(obj.differences ?? "").trim();
  let answer = String(obj.answer ?? "").trim();
  if (!answer) {
    const mdRows = rows
      .map((r) => `| ${r.aspect} | ${r.values.join(" | ")} |`)
      .join("\n");
    const mdHeader = `| ${headers.join(" | ")} |`;
    const sep = `| ${headers.map(() => "---").join(" | ")} |`;
    answer = `${mdHeader}\n${sep}\n${mdRows}\n\n### Key Differences\n\n${differences}`;
  }

  return {
    table: { headers, rows },
    differences,
    answer,
  };
}
