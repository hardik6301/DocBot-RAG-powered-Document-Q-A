import type { Prisma } from "@prisma/client";
import type { SourceCitation, StoredChat, StoredMessage } from "@/types";
import prisma from "@/lib/prisma";
import { MULTI_DOC_CHAT_ID } from "@/lib/chat/constants";
import { resolveOwnerId } from "@/lib/documents/prisma-store";

function mapMessage(m: {
  id: string;
  role: string;
  content: string;
  sources: unknown;
  createdAt: Date;
}): StoredMessage {
  return {
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    sources: (m.sources as SourceCitation[] | null) ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

function mapChat(chat: {
  id: string;
  userId: string;
  documentId: string | null;
  kind: string;
  createdAt: Date;
  updatedAt: Date;
  messages: {
    id: string;
    role: string;
    content: string;
    sources: unknown;
    createdAt: Date;
  }[];
}): StoredChat {
  return {
    id: chat.id,
    documentId:
      chat.kind === "multi" ? MULTI_DOC_CHAT_ID : (chat.documentId ?? ""),
    userId: chat.userId,
    messages: chat.messages.map(mapMessage),
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
  };
}

async function ownerIdOrThrow(userId: string) {
  const ownerId = await resolveOwnerId(userId);
  if (!ownerId) {
    throw new Error(
      "User is not synced to the database yet. Sign out and sign in again.",
    );
  }
  return ownerId;
}

async function findChat(documentId: string, userId: string) {
  if (documentId === MULTI_DOC_CHAT_ID) {
    return prisma.chat.findFirst({
      where: { userId, kind: "multi" },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }
  return prisma.chat.findFirst({
    where: { userId, kind: "document", documentId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function dbGetOrCreateChat(
  documentId: string,
  userId: string,
): Promise<StoredChat> {
  const ownerId = await ownerIdOrThrow(userId);
  const existing = await findChat(documentId, ownerId);
  if (existing) return mapChat(existing);

  // Document chats require the Document row (FK). Multi-doc does not.
  if (documentId !== MULTI_DOC_CHAT_ID) {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) {
      throw new Error(
        "Document is not in the database yet. Open it again from the dashboard, or re-upload.",
      );
    }
  }

  const created = await prisma.chat.create({
    data:
      documentId === MULTI_DOC_CHAT_ID
        ? { userId: ownerId, kind: "multi", documentId: null }
        : { userId: ownerId, kind: "document", documentId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return mapChat(created);
}

export async function dbListMessages(
  documentId: string,
  userId: string,
): Promise<StoredMessage[]> {
  try {
    const chat = await dbGetOrCreateChat(documentId, userId);
    return chat.messages;
  } catch (e) {
    console.error("dbListMessages failed", e);
    return [];
  }
}

export async function dbAppendMessages(
  documentId: string,
  userId: string,
  messages: Omit<StoredMessage, "id" | "createdAt">[],
): Promise<StoredMessage[]> {
  const chat = await dbGetOrCreateChat(documentId, userId);
  const created = await prisma.$transaction(
    messages.map((m) =>
      prisma.message.create({
        data: {
          chatId: chat.id,
          role: m.role,
          content: m.content,
          sources:
            m.sources === null || m.sources === undefined
              ? undefined
              : (m.sources as Prisma.InputJsonValue),
        },
      }),
    ),
  );
  await prisma.chat.update({
    where: { id: chat.id },
    data: { updatedAt: new Date() },
  });
  return created.map(mapMessage);
}

export async function dbDeleteChatsForDocument(documentId: string) {
  await prisma.chat.deleteMany({
    where: { documentId, kind: "document" },
  });
}

export async function dbListChatsForUser(userId: string): Promise<StoredChat[]> {
  const ownerId = (await resolveOwnerId(userId)) ?? userId;
  const rows = await prisma.chat.findMany({
    where: { userId: ownerId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(mapChat);
}
