import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getDocument } from "@/lib/documents/store";
import { appendMessages, listMessages } from "@/lib/chat/store";
import {
  embedQuery,
  generateGroundedAnswer,
  isGeminiConfigured,
} from "@/lib/gemini";
import { isPineconeConfigured, querySimilar } from "@/lib/pinecone";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = new URL(request.url).searchParams.get("documentId");
    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 },
      );
    }

    const doc = await getDocument(documentId, user.id);
    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const messages = await listMessages(documentId, user.id);
    return NextResponse.json({ messages, document: doc });
  } catch (e) {
    console.error("GET /api/chat failed", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Failed to load chat",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
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
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
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

    const question = body.question.trim();
    const vector = await embedQuery(question);
    const namespace = doc.pineconeNs || user.supabaseId || user.id;
    const matches = await querySimilar(namespace, vector, 5, doc.id);
    const usable = matches.filter((m) => m.chunkText && m.score > 0.15);

    let answer: string;
    let sources: {
      chunkText: string;
      page: number | null;
      filename: string;
    }[] = [];

    if (usable.length === 0) {
      answer =
        "I could not find relevant information in this document for that question.";
    } else {
      sources = usable.map((m) => ({
        chunkText: m.chunkText,
        page: m.page,
        filename: m.filename || doc.filename,
      }));
      answer = await generateGroundedAnswer(
        question,
        sources.map((s) => ({
          text: s.chunkText,
          page: s.page,
          filename: s.filename,
        })),
      );
    }

    try {
      await appendMessages(doc.id, user.id, [
        { role: "user", content: question, sources: null },
        { role: "assistant", content: answer, sources },
      ]);
    } catch (persistError) {
      // Still return the answer if history persistence fails.
      console.error("chat history persist failed", persistError);
    }

    return NextResponse.json({ answer, sources });
  } catch (e) {
    console.error("POST /api/chat failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Chat failed" },
      { status: 500 },
    );
  }
}
