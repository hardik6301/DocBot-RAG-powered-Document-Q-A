import { NextResponse } from "next/server";
import { requireUserOrResponse } from "@/lib/auth";
import { deleteDocument, getDocument } from "@/lib/documents/store";
import { deleteChatsForDocument } from "@/lib/chat/store";
import { deleteUploadFile } from "@/lib/storage/files";
import { deleteDocVectors } from "@/lib/pinecone";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await requireUserOrResponse();
  if (user instanceof Response) return user;

  const doc = await getDocument(params.id, user.id);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ document: doc });
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
