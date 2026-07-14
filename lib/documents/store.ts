import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { AppDocument, DocStatus } from "@/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "documents.json");

type StoreShape = {
  documents: AppDocument[];
};

async function ensureStore(): Promise<StoreShape> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as StoreShape;
  } catch {
    const empty: StoreShape = { documents: [] };
    await fs.writeFile(DATA_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
}

async function writeStore(store: StoreShape) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2));
}

export async function listDocuments(userId: string): Promise<AppDocument[]> {
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
  const store = await ensureStore();
  return store.documents.find((d) => d.id === id && d.userId === userId) ?? null;
}

export async function createDocument(
  input: Omit<AppDocument, "id" | "createdAt" | "updatedAt">,
): Promise<AppDocument> {
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
  const store = await ensureStore();
  const idx = store.documents.findIndex(
    (d) => d.id === id && d.userId === userId,
  );
  if (idx === -1) return null;
  store.documents[idx] = {
    ...store.documents[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await writeStore(store);
  return store.documents[idx];
}

export async function deleteDocument(
  id: string,
  userId: string,
): Promise<AppDocument | null> {
  const store = await ensureStore();
  const idx = store.documents.findIndex(
    (d) => d.id === id && d.userId === userId,
  );
  if (idx === -1) return null;
  const [removed] = store.documents.splice(idx, 1);
  await writeStore(store);
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
