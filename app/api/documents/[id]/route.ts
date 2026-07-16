import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { deleteDocument, getDocument } from "@/lib/documents/store";
import { deleteLocalFile } from "@/lib/storage/local";
import { deleteDocVectors } from "@/lib/pinecone";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doc = await getDocument(params.id, user.id);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ document: doc });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const removed = await deleteDocument(params.id, user.id);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deleteLocalFile(removed.fileUrl);
  await deleteDocVectors(removed.pineconeNs || user.id, removed.id);

  return NextResponse.json({ ok: true, id: removed.id });
}
