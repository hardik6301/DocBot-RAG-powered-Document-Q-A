import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { SourceCitation, StoredChat, StoredMessage } from "@/types";
import { dataDir } from "@/lib/paths";
import { useDurableDb } from "@/lib/config";
import { MULTI_DOC_CHAT_ID } from "@/lib/chat/constants";
import {
  dbAppendMessages,
  dbDeleteChatsForDocument,
  dbGetOrCreateChat,
  dbListChatSummaries,
  dbListChatsForUser,
  dbListMessages,
  dbUpdateChatTitle,
} from "@/lib/chat/prisma-store";
import type { ChatSummary } from "@/types";

export { MULTI_DOC_CHAT_ID };

const DATA_FILE = () => path.join(dataDir(), "chats.json");

type StoreShape = {
  chats: StoredChat[];
};

async function ensureStore(): Promise<StoreShape> {
  await fs.mkdir(dataDir(), { recursive: true });
  try {
    const raw = await fs.readFile(DATA_FILE(), "utf8");
    return JSON.parse(raw) as StoreShape;
  } catch {
    const empty: StoreShape = { chats: [] };
    await fs.writeFile(DATA_FILE(), JSON.stringify(empty, null, 2));
    return empty;
  }
}

async function writeStore(store: StoreShape) {
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(DATA_FILE(), JSON.stringify(store, null, 2));
}

export async function getOrCreateChat(
  documentId: string,
  userId: string,
): Promise<StoredChat> {
  if (useDurableDb()) return dbGetOrCreateChat(documentId, userId);

  const store = await ensureStore();
  const existing = store.chats.find(
    (c) => c.documentId === documentId && c.userId === userId,
  );
  if (existing) return existing;

  const now = new Date().toISOString();
  const chat: StoredChat = {
    id: randomUUID(),
    documentId,
    userId,
    title: null,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  store.chats.push(chat);
  await writeStore(store);
  return chat;
}

export async function listMessages(
  documentId: string,
  userId: string,
): Promise<StoredMessage[]> {
  if (useDurableDb()) return dbListMessages(documentId, userId);
  const chat = await getOrCreateChat(documentId, userId);
  return chat.messages;
}

export async function appendMessages(
  documentId: string,
  userId: string,
  messages: Omit<StoredMessage, "id" | "createdAt">[],
): Promise<StoredMessage[]> {
  if (useDurableDb()) return dbAppendMessages(documentId, userId, messages);

  const store = await ensureStore();
  let chat = store.chats.find(
    (c) => c.documentId === documentId && c.userId === userId,
  );
  const now = new Date().toISOString();

  if (!chat) {
    chat = {
      id: randomUUID(),
      documentId,
      userId,
      title: null,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    store.chats.push(chat);
  }

  const created: StoredMessage[] = messages.map((m) => ({
    ...m,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  }));

  chat.messages.push(...created);
  chat.updatedAt = new Date().toISOString();
  if (!chat.title) {
    const firstUser = messages.find((m) => m.role === "user")?.content?.trim();
    if (firstUser) {
      chat.title =
        firstUser.length > 80 ? `${firstUser.slice(0, 77)}…` : firstUser;
    }
  }
  await writeStore(store);
  return created;
}

export async function deleteChatsForDocument(documentId: string) {
  if (useDurableDb()) {
    await dbDeleteChatsForDocument(documentId);
    return;
  }
  const store = await ensureStore();
  store.chats = store.chats.filter((c) => c.documentId !== documentId);
  await writeStore(store);
}

export async function listChatsForUser(userId: string): Promise<StoredChat[]> {
  if (useDurableDb()) return dbListChatsForUser(userId);
  const store = await ensureStore();
  return store.chats.filter((c) => c.userId === userId);
}

export async function listChatSummaries(
  userId: string,
): Promise<ChatSummary[]> {
  if (useDurableDb()) return dbListChatSummaries(userId);

  const store = await ensureStore();
  return store.chats
    .filter((c) => c.userId === userId && c.messages.length > 0)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 50)
    .map((c) => {
      const last = c.messages[c.messages.length - 1];
      const preview = last?.content
        ? last.content.length > 120
          ? `${last.content.slice(0, 117)}…`
          : last.content
        : null;
      return {
        id: c.id,
        kind:
          c.documentId === MULTI_DOC_CHAT_ID
            ? ("multi" as const)
            : ("document" as const),
        documentId:
          c.documentId === MULTI_DOC_CHAT_ID ? null : c.documentId || null,
        documentFilename: null,
        title: c.title ?? null,
        preview,
        messageCount: c.messages.length,
        updatedAt: c.updatedAt,
      };
    });
}

export async function updateChatTitle(
  chatId: string,
  userId: string,
  title: string,
) {
  if (useDurableDb()) return dbUpdateChatTitle(chatId, userId, title);
  const store = await ensureStore();
  const chat = store.chats.find((c) => c.id === chatId && c.userId === userId);
  if (!chat) return null;
  chat.title = title.trim().slice(0, 120);
  chat.updatedAt = new Date().toISOString();
  await writeStore(store);
  return chat;
}

export type { SourceCitation };
