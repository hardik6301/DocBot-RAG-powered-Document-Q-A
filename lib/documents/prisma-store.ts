import type { AppDocument } from "@/types";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function asStringArray(v: unknown): string[] | null {
  if (v == null) return null;
  if (!Array.isArray(v)) return null;
  return v.map((x) => String(x)).filter(Boolean);
}

function normalizeTags(tags: string[] | null | undefined): string[] | null {
  if (tags == null) return null;
  const cleaned = Array.from(
    new Set(
      tags
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 40),
    ),
  ).slice(0, 12);
  return cleaned.length ? cleaned : [];
}

function toApp(doc: {
  id: string;
  userId: string;
  filename: string;
  fileUrl: string;
  fileType: string;
  fileSize: number | null;
  pageCount: number | null;
  chunkCount: number | null;
  pineconeNs: string;
  status: string;
  summary?: string | null;
  keyTopics?: unknown;
  suggestedQuestions?: unknown;
  folder?: string | null;
  tags?: unknown;
  archived?: boolean;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AppDocument {
  return {
    id: doc.id,
    userId: doc.userId,
    filename: doc.filename,
    fileUrl: doc.fileUrl,
    fileType: doc.fileType,
    fileSize: doc.fileSize,
    pageCount: doc.pageCount,
    chunkCount: doc.chunkCount,
    pineconeNs: doc.pineconeNs,
    status: doc.status as AppDocument["status"],
    summary: doc.summary ?? null,
    keyTopics: asStringArray(doc.keyTopics),
    suggestedQuestions: asStringArray(doc.suggestedQuestions),
    folder: doc.folder?.trim() || null,
    tags: asStringArray(doc.tags) ?? [],
    archived: Boolean(doc.archived),
    archivedAt: doc.archivedAt ? doc.archivedAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/** Map Prisma User.id or Supabase auth id → stable Prisma User.id */
export async function resolveOwnerId(userId: string): Promise<string | null> {
  const byId = await prisma.user.findUnique({ where: { id: userId } });
  if (byId) return byId.id;
  const bySupabase = await prisma.user.findUnique({
    where: { supabaseId: userId },
  });
  return bySupabase?.id ?? null;
}

async function ownerFilter(userId: string) {
  const byId = await prisma.user.findUnique({ where: { id: userId } });
  if (byId) {
    return {
      OR: [{ userId: byId.id }, { userId: byId.supabaseId }],
    };
  }
  const bySupabase = await prisma.user.findUnique({
    where: { supabaseId: userId },
  });
  if (bySupabase) {
    return {
      OR: [{ userId: bySupabase.id }, { userId: bySupabase.supabaseId }],
    };
  }
  return { userId };
}

export async function dbListDocuments(userId: string): Promise<AppDocument[]> {
  const where = await ownerFilter(userId);
  const rows = await prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  const seen = new Set<string>();
  return rows
    .map(toApp)
    .filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
}

export async function dbGetDocument(
  id: string,
  userId: string,
): Promise<AppDocument | null> {
  const where = await ownerFilter(userId);
  const row = await prisma.document.findFirst({
    where: { id, ...where },
  });
  return row ? toApp(row) : null;
}

export async function dbCreateDocument(
  input: Omit<AppDocument, "id" | "createdAt" | "updatedAt">,
): Promise<AppDocument> {
  const ownerId = (await resolveOwnerId(input.userId)) ?? input.userId;
  const row = await prisma.document.create({
    data: {
      userId: ownerId,
      filename: input.filename,
      fileUrl: input.fileUrl,
      fileType: input.fileType,
      fileSize: input.fileSize,
      pageCount: input.pageCount,
      chunkCount: input.chunkCount,
      pineconeNs: input.pineconeNs,
      status: input.status,
      summary: input.summary,
      keyTopics: input.keyTopics ?? undefined,
      suggestedQuestions: input.suggestedQuestions ?? undefined,
      folder: input.folder?.trim() || null,
      tags: normalizeTags(input.tags) ?? [],
      archived: input.archived ?? false,
      archivedAt: input.archivedAt ? new Date(input.archivedAt) : null,
    },
  });
  return toApp(row);
}

export const DOCUMENT_UPDATE_KEYS = [
  "status",
  "pageCount",
  "chunkCount",
  "filename",
  "fileUrl",
  "fileSize",
  "summary",
  "keyTopics",
  "suggestedQuestions",
  "folder",
  "tags",
  "archived",
  "archivedAt",
] as const;

export type DocumentUpdatePatch = Partial<
  Pick<AppDocument, (typeof DOCUMENT_UPDATE_KEYS)[number]>
>;

export async function dbUpdateDocument(
  id: string,
  userId: string,
  patch: DocumentUpdatePatch,
): Promise<AppDocument | null> {
  const existing = await dbGetDocument(id, userId);
  if (!existing) return null;

  const data: Prisma.DocumentUpdateInput = {};

  if (patch.status !== undefined) data.status = patch.status;
  if (patch.pageCount !== undefined) data.pageCount = patch.pageCount;
  if (patch.chunkCount !== undefined) data.chunkCount = patch.chunkCount;
  if (patch.filename !== undefined) data.filename = patch.filename.trim();
  if (patch.fileUrl !== undefined) data.fileUrl = patch.fileUrl;
  if (patch.fileSize !== undefined) data.fileSize = patch.fileSize;
  if (patch.summary !== undefined) data.summary = patch.summary;
  if (patch.keyTopics !== undefined) {
    data.keyTopics =
      patch.keyTopics === null
        ? Prisma.DbNull
        : (patch.keyTopics as Prisma.InputJsonValue);
  }
  if (patch.suggestedQuestions !== undefined) {
    data.suggestedQuestions =
      patch.suggestedQuestions === null
        ? Prisma.DbNull
        : (patch.suggestedQuestions as Prisma.InputJsonValue);
  }
  if (patch.folder !== undefined) {
    data.folder = patch.folder?.trim() || null;
  }
  if (patch.tags !== undefined) {
    const tags = normalizeTags(patch.tags);
    data.tags =
      tags === null ? Prisma.DbNull : (tags as Prisma.InputJsonValue);
  }
  if (patch.archived !== undefined) {
    data.archived = patch.archived;
    data.archivedAt = patch.archived
      ? patch.archivedAt
        ? new Date(patch.archivedAt)
        : new Date()
      : null;
  } else if (patch.archivedAt !== undefined) {
    data.archivedAt = patch.archivedAt ? new Date(patch.archivedAt) : null;
  }

  const row = await prisma.document.update({
    where: { id },
    data,
  });
  return toApp(row);
}

export async function dbDeleteDocument(
  id: string,
  userId: string,
): Promise<AppDocument | null> {
  const existing = await dbGetDocument(id, userId);
  if (!existing) return null;
  await prisma.document.delete({ where: { id } });
  return existing;
}

export async function dbCountDocuments(userId: string): Promise<number> {
  const where = await ownerFilter(userId);
  return prisma.document.count({ where });
}

export async function ensureDocumentPersisted(
  doc: AppDocument,
  userId: string,
): Promise<AppDocument> {
  const existing = await prisma.document.findUnique({ where: { id: doc.id } });
  if (existing) return toApp(existing);

  const ownerId = await resolveOwnerId(userId);
  if (!ownerId) {
    throw new Error(
      "User is not synced to the database yet. Sign out and sign in again.",
    );
  }

  try {
    const row = await prisma.document.create({
      data: {
        id: doc.id,
        userId: ownerId,
        filename: doc.filename,
        fileUrl: doc.fileUrl,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        pageCount: doc.pageCount,
        chunkCount: doc.chunkCount,
        pineconeNs: doc.pineconeNs || ownerId,
        status: doc.status,
        summary: doc.summary,
        keyTopics: doc.keyTopics ?? undefined,
        suggestedQuestions: doc.suggestedQuestions ?? undefined,
        folder: doc.folder?.trim() || null,
        tags: normalizeTags(doc.tags) ?? [],
        archived: doc.archived ?? false,
        archivedAt: doc.archivedAt ? new Date(doc.archivedAt) : null,
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt),
      },
    });
    return toApp(row);
  } catch {
    const again = await prisma.document.findUnique({ where: { id: doc.id } });
    if (again) return toApp(again);
    throw new Error("Failed to persist document for chat");
  }
}
