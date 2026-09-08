import { randomBytes } from "crypto";
import type { DocumentShareRow, WorkspaceRow } from "@/types";
import { useDurableDb } from "@/lib/config";
import prisma from "@/lib/prisma";
import { resolveOwnerId } from "@/lib/documents/prisma-store";

function newToken() {
  return randomBytes(24).toString("hex");
}

function mapShare(row: {
  id: string;
  documentId: string;
  email: string;
  userId: string | null;
  role: string;
  token: string;
  status: string;
  invitedBy: string;
  createdAt: Date;
  document?: { filename: string } | null;
}): DocumentShareRow {
  return {
    id: row.id,
    documentId: row.documentId,
    email: row.email,
    userId: row.userId,
    role: row.role === "editor" ? "editor" : "viewer",
    token: row.token,
    status: row.status as DocumentShareRow["status"],
    invitedBy: row.invitedBy,
    createdAt: row.createdAt.toISOString(),
    documentFilename: row.document?.filename,
  };
}

export async function createDocumentShare(input: {
  documentId: string;
  email: string;
  role: "viewer" | "editor";
  invitedByUserId: string;
}): Promise<DocumentShareRow> {
  if (!useDurableDb()) {
    throw new Error("Sharing requires a configured database");
  }
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) throw new Error("Valid email required");

  const inviterId =
    (await resolveOwnerId(input.invitedByUserId)) ?? input.invitedByUserId;
  const existingUser = await prisma.user.findUnique({ where: { email } });

  const row = await prisma.documentShare.upsert({
    where: {
      documentId_email: { documentId: input.documentId, email },
    },
    create: {
      documentId: input.documentId,
      email,
      role: input.role,
      token: newToken(),
      status: existingUser ? "accepted" : "pending",
      userId: existingUser?.id ?? null,
      invitedBy: inviterId,
      updatedAt: new Date(),
    },
    update: {
      role: input.role,
      status: existingUser ? "accepted" : "pending",
      userId: existingUser?.id ?? undefined,
      updatedAt: new Date(),
    },
    include: { document: { select: { filename: true } } },
  });
  return mapShare(row);
}

export async function listSharesForDocument(
  documentId: string,
): Promise<DocumentShareRow[]> {
  if (!useDurableDb()) return [];
  const rows = await prisma.documentShare.findMany({
    where: { documentId, status: { not: "revoked" } },
    orderBy: { createdAt: "desc" },
    include: { document: { select: { filename: true } } },
  });
  return rows.map(mapShare);
}

export async function revokeShare(shareId: string, ownerUserId: string) {
  if (!useDurableDb()) throw new Error("Sharing requires a configured database");
  const ownerId = (await resolveOwnerId(ownerUserId)) ?? ownerUserId;
  const share = await prisma.documentShare.findUnique({
    where: { id: shareId },
    include: { document: true },
  });
  if (!share) return null;
  if (share.document.userId !== ownerId && share.invitedBy !== ownerId) {
    return null;
  }
  const row = await prisma.documentShare.update({
    where: { id: shareId },
    data: { status: "revoked", updatedAt: new Date() },
    include: { document: { select: { filename: true } } },
  });
  return mapShare(row);
}

export async function acceptShareByToken(token: string, user: {
  id: string;
  email: string;
}) {
  if (!useDurableDb()) throw new Error("Sharing requires a configured database");
  const ownerId = (await resolveOwnerId(user.id)) ?? user.id;
  const share = await prisma.documentShare.findUnique({ where: { token } });
  if (!share || share.status === "revoked") {
    throw new Error("Invite not found or revoked");
  }
  if (share.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error("This invite was sent to a different email");
  }
  const row = await prisma.documentShare.update({
    where: { id: share.id },
    data: {
      status: "accepted",
      userId: ownerId,
      updatedAt: new Date(),
    },
    include: { document: { select: { filename: true } } },
  });
  return mapShare(row);
}

export async function listPendingSharesForEmail(email: string) {
  if (!useDurableDb()) return [];
  const rows = await prisma.documentShare.findMany({
    where: { email: email.toLowerCase(), status: "pending" },
    include: { document: { select: { filename: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapShare);
}

export async function createWorkspace(name: string, ownerUserId: string) {
  if (!useDurableDb()) {
    throw new Error("Workspaces require a configured database");
  }
  const ownerId = (await resolveOwnerId(ownerUserId)) ?? ownerUserId;
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) throw new Error("Workspace name required");

  const ws = await prisma.workspace.create({
    data: {
      name: trimmed,
      ownerId,
      members: {
        create: { userId: ownerId, role: "owner" },
      },
      updatedAt: new Date(),
    },
  });
  return {
    id: ws.id,
    name: ws.name,
    ownerId: ws.ownerId,
    role: "owner" as const,
    memberCount: 1,
    createdAt: ws.createdAt.toISOString(),
  } satisfies WorkspaceRow;
}

export async function listWorkspacesForUser(userId: string): Promise<WorkspaceRow[]> {
  if (!useDurableDb()) return [];
  const ownerId = (await resolveOwnerId(userId)) ?? userId;
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: ownerId },
    include: {
      workspace: {
        include: { _count: { select: { members: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    ownerId: m.workspace.ownerId,
    role: (m.role === "owner" || m.role === "admin" ? m.role : "member") as
      | "owner"
      | "admin"
      | "member",
    memberCount: m.workspace._count.members,
    createdAt: m.workspace.createdAt.toISOString(),
  }));
}

export async function addWorkspaceMember(input: {
  workspaceId: string;
  email: string;
  role?: "admin" | "member";
  actorUserId: string;
}) {
  if (!useDurableDb()) {
    throw new Error("Workspaces require a configured database");
  }
  const actorId = (await resolveOwnerId(input.actorUserId)) ?? input.actorUserId;
  const actor = await prisma.workspaceMember.findFirst({
    where: { workspaceId: input.workspaceId, userId: actorId },
  });
  if (!actor || (actor.role !== "owner" && actor.role !== "admin")) {
    throw new Error("Only workspace admins can invite members");
  }
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(
      "That email has no DocBot account yet. Ask them to sign up first.",
    );
  }
  const row = await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: input.workspaceId,
        userId: user.id,
      },
    },
    create: {
      workspaceId: input.workspaceId,
      userId: user.id,
      role: input.role ?? "member",
    },
    update: { role: input.role ?? "member" },
  });
  return row;
}

export async function assignDocumentWorkspace(input: {
  documentId: string;
  workspaceId: string | null;
  ownerUserId: string;
}) {
  if (!useDurableDb()) {
    throw new Error("Workspaces require a configured database");
  }
  const ownerId = (await resolveOwnerId(input.ownerUserId)) ?? input.ownerUserId;
  const doc = await prisma.document.findUnique({
    where: { id: input.documentId },
  });
  if (!doc || doc.userId !== ownerId) {
    throw new Error("Only the document owner can move it to a workspace");
  }
  if (input.workspaceId) {
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: input.workspaceId, userId: ownerId },
    });
    if (!member) throw new Error("You are not a member of that workspace");
  }
  const row = await prisma.document.update({
    where: { id: input.documentId },
    data: { workspaceId: input.workspaceId, updatedAt: new Date() },
  });
  return row;
}
