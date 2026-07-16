import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { SourceCitation, StoredChat, StoredMessage } from "@/types";
import { dataDir } from "@/lib/paths";

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
  const chat = await getOrCreateChat(documentId, userId);
  return chat.messages;
}

export async function appendMessages(
  documentId: string,
  userId: string,
  messages: Omit<StoredMessage, "id" | "createdAt">[],
): Promise<StoredMessage[]> {
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
  await writeStore(store);
  return created;
}

export async function deleteChatsForDocument(documentId: string) {
  const store = await ensureStore();
  store.chats = store.chats.filter((c) => c.documentId !== documentId);
  await writeStore(store);
}

export async function listChatsForUser(userId: string): Promise<StoredChat[]> {
  const store = await ensureStore();
  return store.chats.filter((c) => c.userId === userId);
}

/** Special documentId for cross-document Pro chat sessions. */
export const MULTI_DOC_CHAT_ID = "__multi__";

export type { SourceCitation };
