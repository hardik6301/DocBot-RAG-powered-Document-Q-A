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
  createdAt: string;
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
