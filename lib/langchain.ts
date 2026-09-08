import { promises as fs } from "fs";
import JSZip from "jszip";
import { resolveUploadPath } from "@/lib/storage/local";
import { looksLikeScannedPdf, ocrPdfWithGemini } from "@/lib/ocr";
import { loadEpub } from "@/lib/epub";

export type LoadedPage = {
  page: number;
  text: string;
};

function extractTaggedText(xml: string, pattern: RegExp): string[] {
  const out: string[] = [];
  const re = new RegExp(
    pattern.source,
    pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const t = m[1];
    if (t != null && t.length) out.push(t);
  }
  return out;
}

/** ~500 tokens / ~50 overlap at ~4 chars/token */
const CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 200;
const SECTION_TARGET = 2800;

export async function loadDocumentFile(
  absPath: string,
  fileType: string,
): Promise<LoadedPage[]> {
  const lower = fileType.toLowerCase();
  if (lower === "pdf") return loadPdf(absPath);
  if (lower === "ppt") return loadPptx(absPath);
  if (lower === "docx" || lower === "doc") return loadDocxLike(absPath);
  if (lower === "txt" || lower === "url") return loadPlainText(absPath);
  if (lower === "md" || lower === "markdown") return loadMarkdown(absPath);
  if (lower === "epub") return loadEpub(absPath);
  throw new Error(`Unsupported file type for ingestion: ${fileType}`);
}

async function loadPdf(absPath: string): Promise<LoadedPage[]> {
  const buffer = await fs.readFile(absPath);
  // Worker must load before pdf-parse so Node gets DOMMatrix via @napi-rs/canvas.
  const { CanvasFactory } = await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer, CanvasFactory });
  let pages: LoadedPage[] = [];

  try {
    const textResult = await parser.getText();
    const info = await parser.getInfo().catch(() => null);

    const raw = (typeof textResult === "string"
      ? textResult
      : (textResult as { text?: string })?.text || ""
    ).trim();

    if (raw) {
      const parts = raw.split(/\f+/).map((p) => p.trim()).filter(Boolean);
      if (parts.length > 1) {
        pages = parts.map((text, i) => ({ page: i + 1, text }));
      } else {
        const pageCount = Math.max(
          1,
          Number((info as { total?: number } | null)?.total) || 1,
        );
        if (pageCount === 1) {
          pages = [{ page: 1, text: raw }];
        } else {
          const approx = Math.ceil(raw.length / pageCount);
          for (let i = 0; i < pageCount; i++) {
            const slice = raw.slice(i * approx, (i + 1) * approx).trim();
            if (slice) pages.push({ page: i + 1, text: slice });
          }
          if (!pages.length) pages = [{ page: 1, text: raw }];
        }
      }
    }
  } finally {
    await parser.destroy().catch(() => undefined);
  }

  if (!looksLikeScannedPdf(pages)) return pages;

  // Scanned / image-only PDF → Gemini multimodal OCR fallback.
  return ocrPdfWithGemini(buffer);
}

async function loadPptx(absPath: string): Promise<LoadedPage[]> {
  const buffer = await fs.readFile(absPath);
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/i)?.[1] || 0);
      const nb = Number(b.match(/slide(\d+)/i)?.[1] || 0);
      return na - nb;
    });

  if (slideFiles.length === 0) {
    throw new Error("No slides found in PPT/PPTX");
  }

  const pages: LoadedPage[] = [];
  for (const name of slideFiles) {
    const xml = await zip.files[name]!.async("string");
    const texts = extractTaggedText(xml, /<a:t[^>]*>([^<]*)<\/a:t>/g);
    const text = texts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    const page = Number(name.match(/slide(\d+)/i)?.[1] || pages.length + 1);
    if (text) pages.push({ page, text });
  }

  if (!pages.length) throw new Error("No text extracted from PPT/PPTX");
  return pages;
}

/**
 * Improved DOCX: paragraph-aware extraction, page-break sections,
 * and soft packing into ~SECTION_TARGET char pages for citations.
 */
async function loadDocxLike(absPath: string): Promise<LoadedPage[]> {
  const buffer = await fs.readFile(absPath);
  const zip = await JSZip.loadAsync(buffer);
  const doc = zip.file("word/document.xml");
  if (!doc) throw new Error("Invalid DOC/DOCX file");
  const xml = await doc.async("string");

  const paraBlocks = xml.split(/<w:p[\s>]/i).slice(1);
  if (paraBlocks.length === 0) {
    // Fallback: flat text nodes
    const texts = extractTaggedText(xml, /<w:t[^>]*>([^<]*)<\/w:t>/g);
    const text = texts.join("").replace(/\s+/g, " ").trim();
    if (!text) throw new Error("No text extracted from DOC/DOCX");
    return packSections([text]);
  }

  const sections: string[][] = [[]];
  for (const block of paraBlocks) {
    const runs = extractTaggedText(block, /<w:t[^>]*>([^<]*)<\/w:t>/g);
    // Word often splits mid-word across <w:t> — join without spaces.
    const para = runs.join("").replace(/\s+/g, " ").trim();
    if (para) sections[sections.length - 1]!.push(para);

    const pageBreak =
      /w:type\s*=\s*["']page["']/i.test(block) ||
      /lastRenderedPageBreak/i.test(block);
    if (pageBreak && sections[sections.length - 1]!.length > 0) {
      sections.push([]);
    }
  }

  const joined = sections
    .map((paras) => paras.join("\n\n").trim())
    .filter(Boolean);

  if (!joined.length) throw new Error("No text extracted from DOC/DOCX");
  return packSections(joined);
}

async function loadPlainText(absPath: string): Promise<LoadedPage[]> {
  const raw = (await fs.readFile(absPath, "utf8")).replace(/^\uFEFF/, "").trim();
  if (!raw) throw new Error("Empty text file");
  const paragraphs = raw
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (!paragraphs.length) throw new Error("Empty text file");
  return packSections(paragraphs);
}

async function loadMarkdown(absPath: string): Promise<LoadedPage[]> {
  const raw = (await fs.readFile(absPath, "utf8")).replace(/^\uFEFF/, "").trim();
  if (!raw) throw new Error("Empty markdown file");

  // Split on ATX headings while keeping the heading with its body.
  const parts = raw
    .split(/(?=^#{1,6}\s+)/m)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    const paragraphs = raw
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    return packSections(paragraphs.length ? paragraphs : [raw]);
  }

  return packSections(parts);
}

/** Pack string units into citation-friendly pages near SECTION_TARGET chars. */
function packSections(units: string[]): LoadedPage[] {
  const pages: LoadedPage[] = [];
  let buf = "";

  const flush = () => {
    const text = buf.trim();
    if (!text) return;
    pages.push({ page: pages.length + 1, text });
    buf = "";
  };

  for (const unit of units) {
    const next = buf ? `${buf}\n\n${unit}` : unit;
    if (buf && next.length > SECTION_TARGET) {
      flush();
      buf = unit;
    } else {
      buf = next;
    }
  }
  flush();

  return pages.length ? pages : [{ page: 1, text: units.join("\n\n") }];
}

export type TextChunk = {
  text: string;
  page: number;
  index: number;
};

export function splitPages(
  pages: LoadedPage[],
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP,
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let index = 0;

  for (const page of pages) {
    const text = page.text.replace(/\s+/g, " ").trim();
    if (!text) continue;

    if (text.length <= chunkSize) {
      chunks.push({ text, page: page.page, index: index++ });
      continue;
    }

    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const slice = text.slice(start, end).trim();
      if (slice) chunks.push({ text: slice, page: page.page, index: index++ });
      if (end >= text.length) break;
      start = Math.max(0, end - overlap);
    }
  }

  return chunks;
}

export function absoluteUploadPath(fileUrl: string) {
  return resolveUploadPath(fileUrl);
}
