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

export async function dbListDocuments(userId: string): Promise<AppDocument[]> {
  const rows = await prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toApp);
}

export async function dbGetDocument(
  id: string,
  userId: string,
): Promise<AppDocument | null> {
  const row = await prisma.document.findFirst({ where: { id, userId } });
  return row ? toApp(row) : null;
}

export async function dbCreateDocument(
  input: Omit<AppDocument, "id" | "createdAt" | "updatedAt">,
): Promise<AppDocument> {
  const row = await prisma.document.create({
    data: {
      userId: input.userId,
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
  const existing = await prisma.document.findFirst({ where: { id, userId } });
  if (existing) {
    const row = await prisma.document.update({
      where: { id },
      data: patch,
    });
    return toApp(row);
  }

  // Ownership via User.id OR User.supabaseId (auth fallback used supabase UUID).
  const owner = await prisma.user.findFirst({
    where: { OR: [{ id: userId }, { supabaseId: userId }] },
  });
  if (!owner) return null;

  const owned = await prisma.document.findFirst({
    where: { id, userId: owner.id },
  });
  if (!owned) return null;

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
  const existing = await prisma.document.findFirst({ where: { id, userId } });
  if (!existing) return null;
  await prisma.document.delete({ where: { id } });
  return toApp(existing);
}

export async function dbCountDocuments(userId: string): Promise<number> {
  return prisma.document.count({ where: { userId } });
}
