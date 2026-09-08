import { NextResponse } from "next/server";
import { requireUserOrResponse } from "@/lib/auth";
import {
  deleteDocument,
  getDocument,
  updateDocument,
} from "@/lib/documents/store";
import { deleteChatsForDocument } from "@/lib/chat/store";
import { deleteUploadFile } from "@/lib/storage/files";
import { deleteDocVectors } from "@/lib/pinecone";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

function normalizeTags(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  return Array.from(
    new Set(
      raw
        .map((t) => String(t).trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 40),
    ),
  ).slice(0, 12);
}

export async function GET(_req: Request, { params }: Ctx) {
  const user = await requireUserOrResponse();
  if (user instanceof Response) return user;

  const doc = await getDocument(params.id, user.id);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ document: doc });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const user = await requireUserOrResponse();
  if (user instanceof Response) return user;

  const body = (await request.json().catch(() => null)) as {
    filename?: string;
    folder?: string | null;
    tags?: string[] | null;
    archived?: boolean;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Parameters<typeof updateDocument>[2] = {};

  if (body.filename !== undefined) {
    const name = body.filename.trim();
    if (!name || name.length > 240) {
      return NextResponse.json(
        { error: "filename must be 1–240 characters" },
        { status: 400 },
      );
    }
    patch.filename = name;
  }

  if (body.folder !== undefined) {
    const folder = body.folder?.trim() || null;
    if (folder && folder.length > 80) {
      return NextResponse.json(
        { error: "folder name too long" },
        { status: 400 },
      );
    }
    patch.folder = folder;
  }

  if (body.tags !== undefined) {
    patch.tags = normalizeTags(body.tags) ?? [];
  }

  if (body.archived !== undefined) {
    patch.archived = Boolean(body.archived);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "No supported fields to update" },
      { status: 400 },
    );
  }

  const updated = await updateDocument(params.id, user.id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ document: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await requireUserOrResponse();
  if (user instanceof Response) return user;

  const removed = await deleteDocument(params.id, user.id);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deleteUploadFile(removed.fileUrl);
  await deleteDocVectors(removed.pineconeNs || user.id, removed.id);
  await deleteChatsForDocument(removed.id);

  return NextResponse.json({ ok: true, id: removed.id });
}
