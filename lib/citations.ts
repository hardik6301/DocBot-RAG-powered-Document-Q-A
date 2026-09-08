import type { SourceCitation } from "@/types";

/** Split answer text into plain runs and citation markers like [1]. */
export function splitCitationMarkers(text: string): Array<
  | { type: "text"; value: string }
  | { type: "cite"; index: number; raw: string }
> {
  const parts: Array<
    | { type: "text"; value: string }
    | { type: "cite"; index: number; raw: string }
  > = [];
  const re = /\[(\d+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ type: "text", value: text.slice(last, m.index) });
    }
    parts.push({
      type: "cite",
      index: Number(m[1]),
      raw: m[0],
    });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push({ type: "text", value: text.slice(last) });
  }
  return parts;
}

export function sourceForIndex(
  sources: SourceCitation[] | null | undefined,
  index: number,
): SourceCitation | null {
  if (!sources?.length || index < 1 || index > sources.length) return null;
  return sources[index - 1] ?? null;
}

/** Normalize for fuzzy match between chunk text and PDF text layer. */
export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\s]/gi, "")
    .trim();
}

/**
 * Build a map from normalized string indices → original string indices,
 * then locate the best needle match.
 */
export function findBestExcerptRange(
  haystack: string,
  needle: string,
): { start: number; end: number } | null {
  if (!haystack || !needle) return null;

  const direct = haystack.indexOf(needle);
  if (direct >= 0) return { start: direct, end: direct + needle.length };

  const { normalized: hNorm, map } = buildNormMap(haystack);
  const nNorm = normalizeForMatch(needle);
  if (nNorm.length < 12 || !hNorm) return null;

  const probeLen = Math.min(72, nNorm.length);
  const probeStart = Math.max(0, Math.floor((nNorm.length - probeLen) / 2));
  let at = hNorm.indexOf(nNorm.slice(probeStart, probeStart + probeLen));
  let matchLen = probeLen;
  if (at < 0) {
    matchLen = Math.min(48, nNorm.length);
    at = hNorm.indexOf(nNorm.slice(0, matchLen));
  }
  if (at < 0) return null;
  if (at >= map.length) return null;

  const start = map[at]!;
  const endIdx = Math.min(at + matchLen - 1, map.length - 1);
  const end = map[endIdx]! + 1;
  return { start, end };
}

function buildNormMap(original: string): {
  normalized: string;
  map: number[];
} {
  let normalized = "";
  const map: number[] = [];
  for (let i = 0; i < original.length; i++) {
    const ch = original[i]!;
    if (!/[a-z0-9\s]/i.test(ch)) continue;
    if (/\s/.test(ch)) {
      if (!normalized || normalized.endsWith(" ")) continue;
      normalized += " ";
      map.push(i);
    } else {
      normalized += ch.toLowerCase();
      map.push(i);
    }
  }
  return { normalized, map };
}

/** Highlight needle inside haystack for the passage panel (HTML-safe segments). */
export function highlightExcerptSegments(
  haystack: string,
  needle: string,
): Array<{ text: string; hit: boolean }> {
  const range = findBestExcerptRange(haystack, needle);
  if (!range) return [{ text: haystack, hit: false }];
  return [
    { text: haystack.slice(0, range.start), hit: false },
    { text: haystack.slice(range.start, range.end), hit: true },
    { text: haystack.slice(range.end), hit: false },
  ].filter((s) => s.text.length > 0);
}
