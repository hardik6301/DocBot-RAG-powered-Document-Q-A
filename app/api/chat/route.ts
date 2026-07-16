import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getDocument } from "@/lib/documents/store";
import { embedQuery, generateGroundedAnswer, isGeminiConfigured } from "@/lib/gemini";
import { isPineconeConfigured, querySimilar } from "@/lib/pinecone";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGeminiConfigured() || !isPineconeConfigured()) {
    return NextResponse.json(
      {
        error:
          "RAG is not configured. Set GEMINI_API_KEY and PINECONE_API_KEY in .env.local.",
      },
      { status: 503 },
    );
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
  if (!doc.chunkCount || doc.chunkCount < 1) {
    return NextResponse.json(
      {
        error:
          "Document has no indexed chunks. Re-upload after configuring Gemini + Pinecone.",
      },
      { status: 409 },
    );
  }

  try {
    const question = body.question.trim();
    const vector = await embedQuery(question);
    const matches = await querySimilar(user.id, vector, 5, doc.id);

    const usable = matches.filter((m) => m.chunkText && m.score > 0.15);

    if (usable.length === 0) {
      return NextResponse.json({
        answer:
          "I could not find relevant information in this document for that question.",
        sources: [],
      });
    }

    const answer = await generateGroundedAnswer(
      question,
      usable.map((m) => ({
        text: m.chunkText,
        page: m.page,
        filename: m.filename || doc.filename,
      })),
    );

    return NextResponse.json({
      answer,
      sources: usable.map((m) => ({
        chunkText: m.chunkText,
        page: m.page,
        filename: m.filename || doc.filename,
      })),
    });
  } catch (e) {
    console.error("chat failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Chat failed" },
      { status: 500 },
    );
  }
}
