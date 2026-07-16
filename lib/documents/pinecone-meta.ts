import type { AppDocument, DocStatus } from "@/types";
import { embedTexts } from "@/lib/gemini";
import { ensureIndex, isPineconeConfigured } from "@/lib/pinecone";

const PREFIX = "docmeta::";

function metaId(docId: string) {
  return `${PREFIX}${docId}`;
}

function toDoc(id: string, metadata: Record<string, unknown>): AppDocument {
  return {
    id: String(metadata.docId || id.replace(PREFIX, "")),
    userId: String(metadata.userId || ""),
    filename: String(metadata.filename || "document"),
    fileUrl: String(metadata.fileUrl || ""),
    fileType: String(metadata.fileType || "pdf"),
    fileSize:
      metadata.fileSize === undefined || metadata.fileSize === null
        ? null
        : Number(metadata.fileSize),
    pageCount:
      metadata.pageCount === undefined || metadata.pageCount === null
        ? null
        : Number(metadata.pageCount),
    chunkCount:
      metadata.chunkCount === undefined || metadata.chunkCount === null
        ? null
        : Number(metadata.chunkCount),
    pineconeNs: String(metadata.pineconeNs || metadata.userId || ""),
    status: (String(metadata.status || "processing") as DocStatus) || "processing",
    createdAt: String(metadata.createdAt || new Date().toISOString()),
    updatedAt: String(metadata.updatedAt || new Date().toISOString()),
  };
}

export async function pineconeListDocuments(
  userId: string,
): Promise<AppDocument[]> {
  if (!isPineconeConfigured()) return [];
  const index = await ensureIndex();
  const docs: AppDocument[] = [];
  let paginationToken: string | undefined;

  do {
    const page = await index.listPaginated({
      namespace: userId,
      prefix: PREFIX,
      limit: 100,
      paginationToken,
    });
    const ids = (page.vectors || [])
      .map((v) => v.id)
      .filter((id): id is string => Boolean(id));

    if (ids.length) {
      const fetched = await index.fetch({ ids, namespace: userId });
      for (const rec of Object.values(fetched.records || {})) {
        if (!rec?.metadata) continue;
        docs.push(toDoc(rec.id, rec.metadata as Record<string, unknown>));
      }
    }
    paginationToken = page.pagination?.next;
  } while (paginationToken);

  return docs.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function pineconeGetDocument(
  id: string,
  userId: string,
): Promise<AppDocument | null> {
  if (!isPineconeConfigured()) return null;
  const index = await ensureIndex();
  const fetched = await index.fetch({
    ids: [metaId(id)],
    namespace: userId,
  });
  const rec = fetched.records?.[metaId(id)];
  if (!rec?.metadata) return null;
  return toDoc(rec.id, rec.metadata as Record<string, unknown>);
}

export async function pineconeUpsertDocument(doc: AppDocument) {
  if (!isPineconeConfigured()) return;
  const index = await ensureIndex();
  const [values] = await embedTexts([`${doc.filename} ${doc.id}`]);
  await index.upsert({
    namespace: doc.userId,
    records: [
      {
        id: metaId(doc.id),
        values,
        metadata: {
          kind: "document",
          docId: doc.id,
          userId: doc.userId,
          filename: doc.filename,
          fileUrl: doc.fileUrl.slice(0, 500),
          fileType: doc.fileType,
          fileSize: doc.fileSize ?? 0,
          pageCount: doc.pageCount ?? 0,
          chunkCount: doc.chunkCount ?? 0,
          pineconeNs: doc.pineconeNs,
          status: doc.status,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      },
    ],
  });
}

export async function pineconeDeleteDocument(id: string, userId: string) {
  if (!isPineconeConfigured()) return;
  const index = await ensureIndex();
  await index.deleteMany({
    namespace: userId,
    ids: [metaId(id)],
  });
}
