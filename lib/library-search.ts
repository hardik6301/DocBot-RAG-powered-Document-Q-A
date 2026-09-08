/** Library search across filename, folder, tags, summary, and topics. */
export function documentMatchesQuery(
  doc: {
    filename: string;
    folder?: string | null;
    tags?: string[] | null;
    summary?: string | null;
    keyTopics?: string[] | null;
  },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    doc.filename,
    doc.folder ?? "",
    ...(doc.tags ?? []),
    doc.summary ?? "",
    ...(doc.keyTopics ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return q.split(/\s+/).every((token) => haystack.includes(token));
}
