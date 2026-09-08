import { GoogleGenerativeAI } from "@google/generative-ai";
import { logEvent } from "@/lib/log";

export type OcrPage = {
  page: number;
  text: string;
};

const OCR_MODELS = [
  process.env.GEMINI_CHAT_MODEL?.trim(),
  "gemini-flash-latest",
  "gemini-2.0-flash",
  "gemini-flash-lite-latest",
].filter(Boolean) as string[];

/** PDFs with almost no extractable text are treated as scanned. */
export function looksLikeScannedPdf(pages: { text: string }[]): boolean {
  const text = pages
    .map((p) => p.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return true;
  // Sparse digital PDFs (logo-only cover + images) also need OCR help.
  return text.length < 80;
}

/**
 * OCR / multimodal text extraction for image-heavy or scanned PDFs.
 * Uses Gemini's native PDF understanding — no separate OCR engine.
 */
export async function ocrPdfWithGemini(pdfBytes: Buffer): Promise<OcrPage[]> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY is required for scanned PDF OCR");
  }

  const maxBytes = 18 * 1024 * 1024;
  if (pdfBytes.length > maxBytes) {
    throw new Error(
      "Scanned PDF is too large for OCR fallback (max ~18MB). Try a smaller file or a text PDF.",
    );
  }

  const genAI = new GoogleGenerativeAI(key);
  const prompt = `Extract all readable text from this PDF in reading order.
If pages are scanned images, perform OCR carefully.
Return plain text only. Separate pages with a line that is exactly:
---PAGE---
Do not add commentary, markdown fences, or page numbers as labels.`;

  const data = pdfBytes.toString("base64");
  let lastError: unknown;

  for (const modelName of OCR_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([
        { text: prompt },
        { inlineData: { mimeType: "application/pdf", data } },
      ]);
      const raw = result.response.text().trim();
      if (!raw) throw new Error("OCR returned empty text");

      const parts = raw
        .split(/\n\s*---PAGE---\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);

      const pages =
        parts.length > 1
          ? parts.map((text, i) => ({ page: i + 1, text }))
          : [{ page: 1, text: raw }];

      logEvent("ingest.ocr", {
        model: modelName,
        pages: pages.length,
        chars: pages.reduce((n, p) => n + p.text.length, 0),
      });
      return pages;
    } catch (e) {
      lastError = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (
        msg.includes("429") ||
        msg.includes("503") ||
        msg.includes("404") ||
        msg.includes("not found") ||
        msg.includes("quota") ||
        msg.includes("high demand")
      ) {
        console.warn(
          `Gemini OCR model ${modelName} failed, trying next…`,
          msg.slice(0, 120),
        );
        continue;
      }
      throw e;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All Gemini OCR models failed");
}
