import { NextResponse } from "next/server";
import { requireUserOrResponse } from "@/lib/auth";
import { getDocument, updateDocument } from "@/lib/documents/store";
import { enqueueAndSchedule } from "@/lib/ingest-queue";
import { logEvent } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Re-queue a failed (or stuck processing) document for ingest. */
export async function POST(request: Request) {
  const user = await requireUserOrResponse();
  if (user instanceof Response) return user;

  const body = (await request.json().catch(() => null)) as {
    documentId?: string;
  } | null;

  const documentId = body?.documentId?.trim();
  if (!documentId) {
    return NextResponse.json(
      { error: "documentId is required" },
      { status: 400 },
    );
  }

  const doc = await getDocument(documentId, user.id);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (doc.status === "ready") {
    return NextResponse.json(
      { error: "Document is already ready" },
      { status: 409 },
    );
  }

  await updateDocument(doc.id, user.id, { status: "processing" });

  const vectorNs = doc.pineconeNs || user.supabaseId || user.id;
  const job = await enqueueAndSchedule({
    documentId: doc.id,
    userId: user.id,
    vectorNs,
    filename: doc.filename,
    fileUrl: doc.fileUrl,
    fileType: doc.fileType,
  });

  logEvent("ingest.job.requeued", {
    userId: user.id,
    docId: doc.id,
    jobId: job.id,
  });

  return NextResponse.json({
    document: { ...doc, status: "processing" as const },
    jobId: job.id,
  });
}
