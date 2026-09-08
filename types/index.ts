export type DocStatus = "processing" | "ready" | "failed";

export type AppUser = {
  id: string;
  supabaseId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isPro: boolean;
};

export type AppDocument = {
  id: string;
  userId: string;
  filename: string;
  fileUrl: string;
  fileType: string;
  fileSize: number | null;
  pageCount: number | null;
  chunkCount: number | null;
  pineconeNs: string;
  status: DocStatus;
  /** Phase 9 — AI overview (generated at ingest). */
  summary: string | null;
  keyTopics: string[] | null;
  suggestedQuestions: string[] | null;
  /** Phase 13 — library organization */
  folder: string | null;
  tags: string[] | null;
  archived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Phase 13 — chat history browser row */
export type ChatSummary = {
  id: string;
  kind: "document" | "multi";
  documentId: string | null;
  documentFilename: string | null;
  title: string | null;
  preview: string | null;
  messageCount: number;
  updatedAt: string;
};

export type SourceCitation = {
  chunkText: string;
  page: number | null;
  filename: string;
};

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceCitation[] | null;
  createdAt: string;
};

export type StoredChat = {
  id: string;
  documentId: string;
  userId: string;
  title?: string | null;
  messages: StoredMessage[];
  createdAt: string;
  updatedAt: string;
};

export const LOCAL_DEV_USER: AppUser = {
  id: "local-user",
  supabaseId: "local-dev",
  email: "dev@docbot.local",
  fullName: "Local Developer",
  avatarUrl: null,
  isPro: false,
};
