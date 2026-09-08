import { randomUUID } from "crypto";
import { embedTexts, isGeminiConfigured } from "@/lib/gemini";
import {
  isPineconeConfigured,
  upsertChunks,
  type ChunkRecord,
} from "@/lib/pinecone";
import { loadDocumentFile, splitPages } from "@/lib/langchain";
import { materializeForIngest } from "@/lib/storage/files";
import {
  buildContextualTexts,
  documentPreviewFromPages,
} from "@/lib/contextualize";

export type IngestResult = {
  pageCount: number;
  chunkCount: number;
};

/**
 * Load → chunk → contextual prefix → embed(contextual) → Pinecone upsert.
 * Namespace = userId so users only search their own docs.
 *
 * Pinecone metadata keeps **original** chunkText for citations/display.
 * Embeddings use contextualText (prefix + original) for better retrieval.
 */
export async function ingestDocument(opts: {
  userId: string;
  docId: string;
  filename: string;
  fileUrl: string;
  fileType: string;
}): Promise<IngestResult> {
  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_API_KEY is required for document ingestion");
  }
  if (!isPineconeConfigured()) {
    throw new Error("PINECONE_API_KEY is required for document ingestion");
  }

  const materialized = await materializeForIngest(opts.fileUrl);
  try {
    const pages = await loadDocumentFile(materialized.absPath, opts.fileType);
    const chunks = splitPages(pages);

    if (chunks.length === 0) {
      throw new Error("Document produced zero text chunks");
    }

    const preview = documentPreviewFromPages(pages);
    const contextualTexts = await buildContextualTexts({
      filename: opts.filename,
      documentPreview: preview,
      chunks,
    });

    const vectors = await embedTexts(contextualTexts);

    const records: ChunkRecord[] = chunks.map((c, i) => ({
      id: `${opts.docId}-${c.index}-${randomUUID().slice(0, 8)}`,
      values: vectors[i],
      metadata: {
        filename: opts.filename,
        page: c.page,
        // Original chunk only — used for citations / grounded generation.
        chunkText: c.text,
        docId: opts.docId,
        userId: opts.userId,
      },
    }));

    await upsertChunks(opts.userId, records);

    return {
      pageCount: pages.length,
      chunkCount: chunks.length,
    };
  } finally {
    await materialized.cleanup();
  }
}
