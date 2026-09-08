import { promises as fs } from "fs";
import JSZip from "jszip";

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    );
}

function htmlToPlain(html: string): string {
  return decodeXmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<\/(p|div|h[1-6]|li|tr|section|article|br)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  );
}

function dirnamePath(p: string): string {
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(0, i) : "";
}

function joinPath(base: string, rel: string): string {
  if (!rel) return base;
  if (rel.startsWith("/")) return rel.replace(/^\//, "");
  const parts = [...base.split("/").filter(Boolean), ...rel.split("/")];
  const out: string[] = [];
  for (const part of parts) {
    if (part === "." || !part) continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

/**
 * EPUB = ZIP of XHTML chapters. Walk the OPF spine and extract text in order.
 */
export async function loadEpub(
  absPath: string,
): Promise<{ page: number; text: string }[]> {
  const buffer = await fs.readFile(absPath);
  const zip = await JSZip.loadAsync(buffer);

  const container = zip.file("META-INF/container.xml");
  if (!container) throw new Error("Invalid EPUB: missing container.xml");
  const containerXml = await container.async("string");
  const rootMatch = containerXml.match(
    /full-path\s*=\s*["']([^"']+)["']/i,
  );
  if (!rootMatch?.[1]) throw new Error("Invalid EPUB: no rootfile path");

  const opfPath = rootMatch[1];
  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error(`Invalid EPUB: missing OPF ${opfPath}`);
  const opfXml = await opfFile.async("string");
  const opfDir = dirnamePath(opfPath);

  const idToHref = new Map<string, string>();
  const itemRe =
    /<item\b[^>]*\bid\s*=\s*["']([^"']+)["'][^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;
  const itemReAlt =
    /<item\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*\bid\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(opfXml)) !== null) {
    idToHref.set(m[1]!, m[2]!);
  }
  while ((m = itemReAlt.exec(opfXml)) !== null) {
    idToHref.set(m[2]!, m[1]!);
  }

  const spineIds: string[] = [];
  const spineRe = /<itemref\b[^>]*\bidref\s*=\s*["']([^"']+)["'][^>]*>/gi;
  while ((m = spineRe.exec(opfXml)) !== null) {
    spineIds.push(m[1]!);
  }

  if (!spineIds.length) {
    throw new Error("Invalid EPUB: empty spine");
  }

  const pages: { page: number; text: string }[] = [];
  for (const id of spineIds) {
    const href = idToHref.get(id);
    if (!href) continue;
    const pathInZip = joinPath(opfDir, href);
    const chapter = zip.file(pathInZip);
    if (!chapter) continue;
    const html = await chapter.async("string");
    const text = htmlToPlain(html);
    if (text.length < 20) continue;
    pages.push({ page: pages.length + 1, text });
  }

  if (!pages.length) {
    throw new Error("No text extracted from EPUB");
  }
  return pages;
}
