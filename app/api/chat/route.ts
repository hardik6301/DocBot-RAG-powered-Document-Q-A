import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getDocument } from "@/lib/documents/store";

export const runtime = "nodejs";

/** Phase 4 will wire RAG. Stub keeps chat UI usable. */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    documentId?: string;
    question?: string;
  } | null;

  if (!body?.documentId || !body?.question?.trim()) {
    return NextResponse.json(
      { error: "documentId and question are required" },
      { status: 400 },
    );
  }

  const doc = await getDocument(body.documentId, user.id);
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (doc.status !== "ready") {
    return NextResponse.json(
      { error: "Document is not ready yet" },
      { status: 409 },
    );
  }

  return NextResponse.json({
    answer:
      "RAG chat lands in Phase 3–4. Your document is saved locally — connect Gemini + Pinecone next to get grounded answers with citations.",
    sources: [
      {
        chunkText: `Placeholder citation for “${body.question.trim().slice(0, 80)}” from ${doc.filename}.`,
        page: doc.pageCount ?? 1,
        filename: doc.filename,
      },
    ],
  });
}
