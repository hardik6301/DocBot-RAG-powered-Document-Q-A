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
  dbCreateDocument,
  dbDeleteDocument,
  dbGetDocument,
  dbListDocuments,
  dbUpdateDocument,
  ensureDocumentPersisted,
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

/** Keep one card per filename+size (newest ready wins). */
function dedupeDocuments(docs: AppDocument[]): AppDocument[] {
  const byKey = new Map<string, AppDocument>();

  for (const doc of docs) {
    const key = `${doc.filename.toLowerCase()}::${doc.fileSize ?? 0}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, doc);
      continue;
    }
    const rank = (d: AppDocument) =>
      (d.status === "ready" ? 1e15 : 0) + new Date(d.createdAt).getTime();
    if (rank(doc) >= rank(prev)) byKey.set(key, doc);
  }

  return Array.from(byKey.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

async function pineconeNamespacesFor(userId: string): Promise<string[]> {
  const ns = new Set<string>([userId]);
  if (useDurableDb()) {
    try {
      const prisma = (await import("@/lib/prisma")).default;
      const owner = await prisma.user.findFirst({
        where: { OR: [{ id: userId }, { supabaseId: userId }] },
      });
      if (owner) {
        ns.add(owner.id);
        ns.add(owner.supabaseId);
      }
    } catch {
      // ignore
    }
  }
  return Array.from(ns);
}

async function pineconeGetFromAnyNs(
  id: string,
  userId: string,
): Promise<AppDocument | null> {
  if (!isPineconeConfigured()) return null;
  for (const ns of await pineconeNamespacesFor(userId)) {
    try {
      const doc = await pineconeGetDocument(id, ns);
      if (doc) return doc;
    } catch (e) {
      console.error("pinecone get failed", ns, e);
    }
  }
  return null;
}

async function pineconeListFromAnyNs(userId: string): Promise<AppDocument[]> {
  if (!isPineconeConfigured()) return [];
  const byId = new Map<string, AppDocument>();
  for (const ns of await pineconeNamespacesFor(userId)) {
    try {
      for (const doc of await pineconeListDocuments(ns)) {
        byId.set(doc.id, doc);
      }
    } catch (e) {
      console.error("pinecone list failed", ns, e);
    }
  }
  return Array.from(byId.values());
}

export async function listDocuments(userId: string): Promise<AppDocument[]> {
  const byId = new Map<string, AppDocument>();

  if (useDurableDb()) {
    try {
      for (const doc of await dbListDocuments(userId)) {
        byId.set(doc.id, doc);
      }
    } catch (e) {
      console.error("db list documents failed; falling back", e);
    }
  }

  // Merge Pinecone meta only when DB empty/unavailable — avoids duplicate cards
  // from dual-writes, but still recovers UUID docs if Postgres flakes.
  if (byId.size === 0) {
    for (const doc of await pineconeListFromAnyNs(userId)) {
      byId.set(doc.id, doc);
    }
  }

  if (byId.size === 0 && !isVercelRuntime()) {
    const store = await ensureStore();
    for (const doc of store.documents.filter((d) => d.userId === userId)) {
      byId.set(doc.id, doc);
    }
  }

  return dedupeDocuments(Array.from(byId.values()));
}

export async function getDocument(
  id: string,
  userId: string,
): Promise<AppDocument | null> {
  if (useDurableDb()) {
    try {
      const doc = await dbGetDocument(id, userId);
      if (doc) return doc;
    } catch (e) {
      console.error("db get document failed; falling back", e);
    }
  }

  // Critical: UUID meta docs live in Pinecone; promote into Postgres so Chat FK works.
  const remote = await pineconeGetFromAnyNs(id, userId);
  if (remote) {
    if (useDurableDb()) {
      try {
        return await ensureDocumentPersisted(remote, userId);
      } catch (e) {
        console.error("persist pinecone document failed", e);
        return remote;
      }
    }
    return remote;
  }

  if (!isVercelRuntime()) {
    const store = await ensureStore();
    return (
      store.documents.find((d) => d.id === id && d.userId === userId) ?? null
    );
  }
  return null;
}

export async function createDocument(
  input: Omit<AppDocument, "id" | "createdAt" | "updatedAt">,
): Promise<AppDocument> {
  if (useDurableDb()) {
    try {
      // Postgres only — do not also write Pinecone meta (that caused 2× cards).
      return await dbCreateDocument(input);
    } catch (e) {
      console.error("db create document failed; falling back", e);
    }
  }

  const now = new Date().toISOString();
  const doc: AppDocument = {
    ...input,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  if (!isVercelRuntime()) {
    const store = await ensureStore();
    store.documents.push(doc);
    await writeStore(store);
  }

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
  let updated: AppDocument | null = null;
  let fromDb = false;

  if (useDurableDb()) {
    try {
      updated = await dbUpdateDocument(id, userId, patch);
      if (updated) fromDb = true;
    } catch (e) {
      console.error("db update document failed; falling back", e);
    }
  }

  if (!updated && !isVercelRuntime()) {
    const store = await ensureStore();
    const idx = store.documents.findIndex(
      (d) => d.id === id && d.userId === userId,
    );
    if (idx !== -1) {
      store.documents[idx] = {
        ...store.documents[idx],
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      await writeStore(store);
      updated = store.documents[idx];
    }
  }

  if (!updated && isPineconeConfigured()) {
    try {
      const existing = await pineconeGetFromAnyNs(id, userId);
      if (existing) {
        updated = {
          ...existing,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
      }
    } catch (e) {
      console.error("pinecone get document for update failed", e);
    }
  }

  // Only mirror meta to Pinecone when Postgres is not the source of truth.
  if (updated && isPineconeConfigured() && !fromDb) {
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
  let removed: AppDocument | null = null;

  if (useDurableDb()) {
    try {
      removed = await dbDeleteDocument(id, userId);
    } catch (e) {
      console.error("db delete document failed; falling back", e);
    }
  }

  if (!removed && !isVercelRuntime()) {
    const store = await ensureStore();
    const idx = store.documents.findIndex(
      (d) => d.id === id && d.userId === userId,
    );
    if (idx !== -1) {
      [removed] = store.documents.splice(idx, 1);
      await writeStore(store);
    }
  }

  if (!removed) {
    removed = await pineconeGetFromAnyNs(id, userId);
  }

  // Clean both namespaces so ghosts don't reappear.
  if (isPineconeConfigured()) {
    for (const ns of await pineconeNamespacesFor(userId)) {
      try {
        await pineconeDeleteDocument(id, ns);
      } catch (e) {
        console.error("pinecone delete document failed", ns, e);
      }
    }
  }
  return removed;
}

export async function countDocuments(userId: string): Promise<number> {
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
