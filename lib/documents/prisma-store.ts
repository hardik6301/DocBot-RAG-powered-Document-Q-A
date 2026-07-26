import type { AppDocument } from "@/types";
import prisma from "@/lib/prisma";

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
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/** Map Prisma User.id or Supabase auth id → stable Prisma User.id */
export async function resolveOwnerId(userId: string): Promise<string | null> {
  const owner = await prisma.user.findFirst({
    where: { OR: [{ id: userId }, { supabaseId: userId }] },
  });
  return owner?.id ?? null;
}

async function ownerFilter(userId: string) {
  const owner = await prisma.user.findFirst({
    where: { OR: [{ id: userId }, { supabaseId: userId }] },
  });
  if (!owner) return { userId };
  // Include legacy rows accidentally stored under the Supabase UUID.
  return {
    OR: [{ userId: owner.id }, { userId: owner.supabaseId }],
  };
}

export async function dbListDocuments(userId: string): Promise<AppDocument[]> {
  const where = await ownerFilter(userId);
  const rows = await prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  // Dedupe by id (should already be unique).
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
    },
  });
  return toApp(row);
}

export async function dbUpdateDocument(
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
  const existing = await dbGetDocument(id, userId);
  if (!existing) return null;
  const row = await prisma.document.update({
    where: { id },
    data: patch,
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
