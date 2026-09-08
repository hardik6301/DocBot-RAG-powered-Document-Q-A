import { isIP } from "net";
import { logEvent } from "@/lib/log";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = 2 * 1024 * 1024;

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    );
}

export function htmlToPlainText(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = decodeEntities(
    (titleMatch?.[1] || "Webpage").replace(/\s+/g, " ").trim(),
  ).slice(0, 180);

  const text = decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/(p|div|h[1-6]|li|tr|section|article|header|footer)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  );

  return { title: title || "Webpage", text };
}

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "metadata.google.internal"
  ) {
    return true;
  }

  const ipVersion = isIP(host);
  if (!ipVersion) return false;

  if (ipVersion === 4) {
    const parts = host.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b != null && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }

  // IPv6 local / link-local / unique-local
  return (
    host === "::1" ||
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    host.startsWith("fe80")
  );
}

export function assertSafePublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  if (isPrivateHostname(url.hostname)) {
    throw new Error("That host is not allowed");
  }
  return url;
}

export async function fetchWebpage(rawUrl: string): Promise<{
  url: string;
  title: string;
  text: string;
  contentType: string;
}> {
  const url = assertSafePublicUrl(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "DocBotIngest/1.0 (+https://thedocbot.vercel.app)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch URL (${res.status})`);
    }

    // Re-check final URL after redirects
    assertSafePublicUrl(res.url);

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const len = Number(res.headers.get("content-length") || 0);
    if (len && len > MAX_BYTES) {
      throw new Error("Page is too large to ingest (max 2MB)");
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      throw new Error("Page is too large to ingest (max 2MB)");
    }

    const body = buf.toString("utf8");
    if (
      contentType.includes("text/plain") &&
      !contentType.includes("html")
    ) {
      const text = body.trim();
      if (text.length < 40) throw new Error("Page has almost no text");
      logEvent("ingest.url", { host: url.hostname, chars: text.length });
      return {
        url: res.url,
        title: url.hostname,
        text,
        contentType,
      };
    }

    const { title, text } = htmlToPlainText(body);
    if (text.length < 40) {
      throw new Error("Page has almost no extractable text");
    }

    logEvent("ingest.url", {
      host: url.hostname,
      chars: text.length,
      title: title.slice(0, 80),
    });

    return {
      url: res.url,
      title,
      text,
      contentType: contentType || "text/html",
    };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Timed out fetching URL");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function sanitizeFilename(title: string): string {
  const base = title
    .replace(/[^\w\s.-]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${base || "webpage"}.txt`;
}
