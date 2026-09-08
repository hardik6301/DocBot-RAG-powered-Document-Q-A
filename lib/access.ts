import type { AccessRole, AppDocument, AppUser } from "@/types";
import { useDurableDb } from "@/lib/config";
import prisma from "@/lib/prisma";
import { resolveOwnerId } from "@/lib/documents/prisma-store";
import { getDocument, listDocuments } from "@/lib/documents/store";

export type AccessContext = {
  document: AppDocument;
  role: AccessRole;
};

function roleRank(role: AccessRole): number {
  if (role === "owner") return 3;
  if (role === "editor") return 2;
  return 1;
}

export function canChat(role: AccessRole) {
  return roleRank(role) >= 1;
}

export function canEditMeta(role: AccessRole) {
  return roleRank(role) >= 2;
}

export function canManageShares(role: AccessRole) {
  return role === "owner";
}

export function canDeleteDocument(role: AccessRole) {
  return role === "owner";
}

function mapDoc(row: {
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
  summary: string | null;
  keyTopics: unknown;
  suggestedQuestions: unknown;
  folder: string | null;
  tags: unknown;
  archived: boolean;
  archivedAt: Date | null;
  workspaceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AppDocument {
  const asStringArray = (v: unknown): string[] | null => {
    if (v == null) return null;
    if (!Array.isArray(v)) return null;
    return v.map((x) => String(x)).filter(Boolean);
  };
  return {
    id: row.id,
    userId: row.userId,
    filename: row.filename,
    fileUrl: row.fileUrl,
    fileType: row.fileType,
    fileSize: row.fileSize,
    pageCount: row.pageCount,
    chunkCount: row.chunkCount,
    pineconeNs: row.pineconeNs,
    status: row.status as AppDocument["status"],
    summary: row.summary,
    keyTopics: asStringArray(row.keyTopics),
    suggestedQuestions: asStringArray(row.suggestedQuestions),
    folder: row.folder,
    tags: asStringArray(row.tags) ?? [],
    archived: row.archived,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    workspaceId: row.workspaceId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function ownerIdsFor(user: AppUser): Promise<string[]> {
  const ids = new Set<string>([user.id, user.supabaseId].filter(Boolean));
  if (useDurableDb()) {
    const ownerId = await resolveOwnerId(user.id);
    if (ownerId) ids.add(ownerId);
    const byEmail = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
    });
    if (byEmail) ids.add(byEmail.id);
  }
  return Array.from(ids);
}

/** Resolve document access for owner, share, or workspace membership. */
export async function getAccessibleDocument(
  documentId: string,
  user: AppUser,
): Promise<AccessContext | null> {
  const owned = await getDocument(documentId, user.id);
  if (owned) {
    return { document: { ...owned, accessRole: "owner" }, role: "owner" };
  }

  if (!useDurableDb()) return null;

  const ownerIds = await ownerIdsFor(user);
  const email = user.email.toLowerCase();

  const row = await prisma.document.findUnique({ where: { id: documentId } });
  if (!row) return null;

  // Direct ownership via dual-id
  if (ownerIds.includes(row.userId)) {
    const doc = mapDoc(row);
    return { document: { ...doc, accessRole: "owner" }, role: "owner" };
  }

  const share = await prisma.documentShare.findFirst({
    where: {
      documentId,
      status: "accepted",
      OR: [{ userId: { in: ownerIds } }, { email }],
    },
  });
  if (share) {
    const role = share.role === "editor" ? "editor" : "viewer";
    const doc = mapDoc(row);
    return {
      document: {
        ...doc,
        accessRole: role,
        sharedByEmail: null,
      },
      role,
    };
  }

  if (row.workspaceId) {
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: row.workspaceId,
        userId: { in: ownerIds },
      },
    });
    if (membership) {
      const role: AccessRole =
        membership.role === "owner" || membership.role === "admin"
          ? "editor"
          : "viewer";
      const doc = mapDoc(row);
      return { document: { ...doc, accessRole: role }, role };
    }
  }

  return null;
}

/** Owned docs + accepted shares + workspace docs (deduped). */
export async function listAccessibleDocuments(
  user: AppUser,
): Promise<AppDocument[]> {
  const owned = await listDocuments(user.id);
  const byId = new Map<string, AppDocument>();
  for (const d of owned) {
    byId.set(d.id, { ...d, accessRole: "owner" });
  }

  if (!useDurableDb()) return Array.from(byId.values());

  const ownerIds = await ownerIdsFor(user);
  const email = user.email.toLowerCase();

  const shares = await prisma.documentShare.findMany({
    where: {
      status: "accepted",
      OR: [{ userId: { in: ownerIds } }, { email }],
    },
    include: { document: true },
  });
  for (const s of shares) {
    if (byId.has(s.documentId)) continue;
    const role = s.role === "editor" ? "editor" : "viewer";
    byId.set(s.documentId, {
      ...mapDoc(s.document),
      accessRole: role,
    });
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: { in: ownerIds } },
    select: { workspaceId: true, role: true },
  });
  if (memberships.length) {
    const wsIds = memberships.map((m) => m.workspaceId);
    const roleByWs = new Map(memberships.map((m) => [m.workspaceId, m.role]));
    const docs = await prisma.document.findMany({
      where: { workspaceId: { in: wsIds } },
    });
    for (const row of docs) {
      if (byId.has(row.id)) continue;
      const mRole = roleByWs.get(row.workspaceId || "") || "member";
      const role: AccessRole =
        mRole === "owner" || mRole === "admin" ? "editor" : "viewer";
      byId.set(row.id, { ...mapDoc(row), accessRole: role });
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
