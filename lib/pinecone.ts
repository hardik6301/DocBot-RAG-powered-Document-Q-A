import { Pinecone } from "@pinecone-database/pinecone";

const EMBED_DIM = 768;

export type ChunkRecord = {
  id: string;
  values: number[];
  metadata: {
    filename: string;
    page: number;
    chunkText: string;
    docId: string;
    userId: string;
  };
};

function getPinecone() {
  const key = process.env.PINECONE_API_KEY?.trim();
  if (!key) {
    throw new Error("PINECONE_API_KEY is missing in .env.local");
  }
  return new Pinecone({ apiKey: key });
}

function indexName() {
  return process.env.PINECONE_INDEX?.trim() || "docbot";
}

export function isPineconeConfigured() {
  return Boolean(process.env.PINECONE_API_KEY?.trim());
}

/** Ensure serverless index exists (768-dim cosine). */
export async function ensureIndex() {
  const pc = getPinecone();
  const name = indexName();
  const list = await pc.listIndexes();
  const exists = list.indexes?.some((i) => i.name === name);
  if (!exists) {
    await pc.createIndex({
      name,
      dimension: EMBED_DIM,
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
    });
    for (let i = 0; i < 30; i++) {
      const desc = await pc.describeIndex(name);
      if (desc.status?.ready) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return pc.index({ name });
}

export async function upsertChunks(
  namespace: string,
  records: ChunkRecord[],
) {
  if (records.length === 0) return;
  const index = await ensureIndex();
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await index.upsert({
      namespace,
      records: batch.map((r) => ({
        id: r.id,
        values: r.values,
        metadata: {
          ...r.metadata,
          chunkText: r.metadata.chunkText.slice(0, 3500),
        },
      })),
    });
  }
}

export async function deleteDocVectors(namespace: string, docId: string) {
  if (!isPineconeConfigured()) return;
  try {
    const index = await ensureIndex();
    await index.deleteMany({
      namespace,
      filter: { docId: { $eq: docId } },
    });
  } catch (e) {
    console.error("Pinecone delete failed", e);
  }
}

export async function querySimilar(
  namespace: string,
  vector: number[],
  topK = 5,
  docId?: string,
) {
  const index = await ensureIndex();
  const result = await index.query({
    namespace,
    vector,
    topK,
    includeMetadata: true,
    filter: docId ? { docId: { $eq: docId } } : undefined,
  });

  return (result.matches ?? []).map((m) => ({
    id: m.id,
    score: m.score ?? 0,
    chunkText: String(m.metadata?.chunkText ?? ""),
    page:
      typeof m.metadata?.page === "number"
        ? m.metadata.page
        : Number(m.metadata?.page) || null,
    filename: String(m.metadata?.filename ?? ""),
    docId: String(m.metadata?.docId ?? ""),
  }));
}
