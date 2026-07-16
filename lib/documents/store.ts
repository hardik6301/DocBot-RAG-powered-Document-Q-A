import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { AppDocument, DocStatus } from "@/types";
import { dataDir, isVercelRuntime } from "@/lib/paths";
import { useDurableDb } from "@/lib/config";
import { isPineconeConfigured } from "@/lib/pinecone";
import {
  pineconeDeleteDocument,
  pineconeGetDocument,
  pineconeListDocuments,
  pineconeUpsertDocument,
} from "@/lib/documents/pinecone-meta";
import {
  dbCountDocuments,
  dbCreateDocument,
  dbDeleteDocument,
  dbGetDocument,
  dbListDocuments,
  dbUpdateDocument,
} from "@/lib/documents/prisma-store";

const DATA_FILE = () => path.join(dataDir(), "documents.json");

type StoreShape = {
  documents: AppDocument[];
};

async function ensureStore(): Promise<StoreShape> {
  await fs.mkdir(dataDir(), { recursive: true });
  try {
    const raw = await fs.readFile(DATA_FILE(), "utf8");
    return JSON.parse(raw) as StoreShape;
  } catch {
    const empty: StoreShape = { documents: [] };
    await fs.writeFile(DATA_FILE(), JSON.stringify(empty, null, 2));
    return empty;
  }
}

async function writeStore(store: StoreShape) {
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(DATA_FILE(), JSON.stringify(store, null, 2));
}

async function preferPineconeMeta() {
  if (useDurableDb()) return false;
  return (
    isPineconeConfigured() &&
    (isVercelRuntime() || process.env.USE_PINECONE_DOCS === "1")
  );
}

export async function listDocuments(userId: string): Promise<AppDocument[]> {
  if (useDurableDb()) return dbListDocuments(userId);

  if (await preferPineconeMeta()) {
    try {
      const remote = await pineconeListDocuments(userId);
      if (remote.length) return remote;
    } catch (e) {
      console.error("pinecone list documents failed", e);
    }
  }
  const store = await ensureStore();
  return store.documents
    .filter((d) => d.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export async function getDocument(
  id: string,
  userId: string,
): Promise<AppDocument | null> {
  if (useDurableDb()) return dbGetDocument(id, userId);

  if (await preferPineconeMeta()) {
    try {
      const remote = await pineconeGetDocument(id, userId);
      if (remote) return remote;
    } catch (e) {
      console.error("pinecone get document failed", e);
    }
  }
  const store = await ensureStore();
  return store.documents.find((d) => d.id === id && d.userId === userId) ?? null;
}

export async function createDocument(
  input: Omit<AppDocument, "id" | "createdAt" | "updatedAt">,
): Promise<AppDocument> {
  if (useDurableDb()) return dbCreateDocument(input);

  const store = await ensureStore();
  const now = new Date().toISOString();
  const doc: AppDocument = {
    ...input,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  store.documents.push(doc);
  await writeStore(store);
  try {
    if (isPineconeConfigured()) await pineconeUpsertDocument(doc);
  } catch (e) {
    console.error("pinecone upsert document meta failed", e);
  }
  return doc;
}

export async function updateDocument(
  id: string,
  userId: string,
  patch: Partial<
    Pick<
      AppDocument,
      | "status"
      | "pageCount"
      | "chunkCount"
      | "filename"
      | "fileUrl"
      | "fileSize"
    >
  >,
): Promise<AppDocument | null> {
  if (useDurableDb()) return dbUpdateDocument(id, userId, patch);

  const store = await ensureStore();
  const idx = store.documents.findIndex(
    (d) => d.id === id && d.userId === userId,
  );

  let updated: AppDocument | null = null;
  if (idx !== -1) {
    store.documents[idx] = {
      ...store.documents[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await writeStore(store);
    updated = store.documents[idx];
  } else if (await preferPineconeMeta()) {
    const existing = await pineconeGetDocument(id, userId);
    if (!existing) return null;
    updated = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
  }

  if (updated && isPineconeConfigured()) {
    try {
      await pineconeUpsertDocument(updated);
    } catch (e) {
      console.error("pinecone update document meta failed", e);
    }
  }
  return updated;
}

export async function deleteDocument(
  id: string,
  userId: string,
): Promise<AppDocument | null> {
  if (useDurableDb()) return dbDeleteDocument(id, userId);

  const store = await ensureStore();
  const idx = store.documents.findIndex(
    (d) => d.id === id && d.userId === userId,
  );
  let removed: AppDocument | null = null;
  if (idx !== -1) {
    [removed] = store.documents.splice(idx, 1);
    await writeStore(store);
  } else {
    removed = await pineconeGetDocument(id, userId);
  }
  if (removed && isPineconeConfigured()) {
    try {
      await pineconeDeleteDocument(id, userId);
    } catch (e) {
      console.error("pinecone delete document meta failed", e);
    }
  }
  return removed;
}

export async function countDocuments(userId: string): Promise<number> {
  if (useDurableDb()) return dbCountDocuments(userId);
  const docs = await listDocuments(userId);
  return docs.length;
}

export function isAllowedFile(filename: string, mime: string) {
  const lower = filename.toLowerCase();
  const okExt =
    lower.endsWith(".pdf") ||
    lower.endsWith(".ppt") ||
    lower.endsWith(".pptx") ||
    lower.endsWith(".doc") ||
    lower.endsWith(".docx");
  const okMime =
    mime.includes("pdf") ||
    mime.includes("presentation") ||
    mime.includes("msword") ||
    mime.includes("officedocument") ||
    mime === "" ||
    mime === "application/octet-stream";
  return okExt && okMime;
}

export function detectFileType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) return "ppt";
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "docx";
  return "unknown";
}

export type { DocStatus };
