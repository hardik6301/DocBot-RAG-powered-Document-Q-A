import { promises as fs } from "fs";
import path from "path";
import JSZip from "jszip";

export type LoadedPage = {
  page: number;
  text: string;
};

function extractTaggedText(xml: string, pattern: RegExp): string[] {
  const out: string[] = [];
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const t = m[1]?.trim();
    if (t) out.push(t);
  }
  return out;
}

/** ~500 tokens / ~50 overlap at ~4 chars/token */
const CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 200;

export async function loadDocumentFile(
  absPath: string,
  fileType: string,
): Promise<LoadedPage[]> {
  const lower = fileType.toLowerCase();
  if (lower === "pdf") return loadPdf(absPath);
  if (lower === "ppt") return loadPptx(absPath);
  if (lower === "docx") return loadDocxLike(absPath);
  throw new Error(`Unsupported file type for ingestion: ${fileType}`);
}

async function loadPdf(absPath: string): Promise<LoadedPage[]> {
  const buffer = await fs.readFile(absPath);
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const textResult = await parser.getText();
  const info = await parser.getInfo().catch(() => null);
  await parser.destroy().catch(() => undefined);

  const raw = (typeof textResult === "string"
    ? textResult
    : (textResult as { text?: string })?.text || ""
  ).trim();

  if (!raw) throw new Error("No text extracted from PDF");

  const parts = raw.split(/\f+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    return parts.map((text, i) => ({ page: i + 1, text }));
  }

  const pageCount = Math.max(
    1,
    Number((info as { total?: number } | null)?.total) || 1,
  );
  if (pageCount === 1) return [{ page: 1, text: raw }];

  const approx = Math.ceil(raw.length / pageCount);
  const pages: LoadedPage[] = [];
  for (let i = 0; i < pageCount; i++) {
    const slice = raw.slice(i * approx, (i + 1) * approx).trim();
    if (slice) pages.push({ page: i + 1, text: slice });
  }
  return pages.length ? pages : [{ page: 1, text: raw }];
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
    const xml = await zip.files[name].async("string");
    const texts = extractTaggedText(xml, /<a:t[^>]*>([^<]*)<\/a:t>/g);
    const text = texts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    const page = Number(name.match(/slide(\d+)/i)?.[1] || pages.length + 1);
    if (text) pages.push({ page, text });
  }

  if (!pages.length) throw new Error("No text extracted from PPT/PPTX");
  return pages;
}

async function loadDocxLike(absPath: string): Promise<LoadedPage[]> {
  // Minimal docx: word/document.xml text nodes
  const buffer = await fs.readFile(absPath);
  const zip = await JSZip.loadAsync(buffer);
  const doc = zip.file("word/document.xml");
  if (!doc) throw new Error("Invalid DOC/DOCX file");
  const xml = await doc.async("string");
  const texts = extractTaggedText(xml, /<w:t[^>]*>([^<]*)<\/w:t>/g);
  const text = texts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (!text) throw new Error("No text extracted from DOC/DOCX");
  return [{ page: 1, text }];
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
  // fileUrl like /uploads/user/file.pdf
  return path.join(process.cwd(), "public", fileUrl.replace(/^\//, ""));
}
