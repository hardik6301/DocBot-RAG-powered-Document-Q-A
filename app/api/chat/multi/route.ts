import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  MULTI_DOC_CHAT_ID,
  appendMessages,
  listMessages,
} from "@/lib/chat/store";
import { listDocuments } from "@/lib/documents/store";
import {
  embedQuery,
  generateGroundedAnswer,
  isGeminiConfigured,
} from "@/lib/gemini";
import { isPineconeConfigured, querySimilar } from "@/lib/pinecone";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.isPro) {
    return NextResponse.json(
      { error: "Multi-document Q&A is a Pro feature." },
      { status: 403 },
    );
  }

  const messages = await listMessages(MULTI_DOC_CHAT_ID, user.id);
  const documents = (await listDocuments(user.id)).filter(
    (d) => d.status === "ready" && (d.chunkCount ?? 0) > 0,
  );
  return NextResponse.json({ messages, documents });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.isPro) {
    return NextResponse.json(
      { error: "Multi-document Q&A is a Pro feature. Upgrade to unlock." },
      { status: 403 },
    );
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
    question?: string;
    documentIds?: string[];
  } | null;

  if (!body?.question?.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const ready = (await listDocuments(user.id)).filter(
    (d) => d.status === "ready" && (d.chunkCount ?? 0) > 0,
  );
  if (ready.length === 0) {
    return NextResponse.json(
      { error: "No ready documents to search. Upload and wait for indexing." },
      { status: 409 },
    );
  }

  let scopeIds = ready.map((d) => d.id);
  if (body.documentIds?.length) {
    const allowed = new Set(scopeIds);
    scopeIds = body.documentIds.filter((id) => allowed.has(id));
    if (scopeIds.length === 0) {
      return NextResponse.json(
        { error: "None of the selected documents are ready" },
        { status: 400 },
      );
    }
  }

  try {
    const question = body.question.trim();
    const vector = await embedQuery(question);
    const namespace = user.supabaseId || user.id;
    const matches = await querySimilar(namespace, vector, 8, scopeIds);
    const usable = matches.filter((m) => m.chunkText && m.score > 0.15);

    let answer: string;
    let sources: {
      chunkText: string;
      page: number | null;
      filename: string;
    }[] = [];

    if (usable.length === 0) {
      answer =
        "I could not find relevant information across your selected documents.";
    } else {
      sources = usable.map((m) => ({
        chunkText: m.chunkText,
        page: m.page,
        filename: m.filename || "document",
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

    await appendMessages(MULTI_DOC_CHAT_ID, user.id, [
      { role: "user", content: question, sources: null },
      { role: "assistant", content: answer, sources },
    ]);

    return NextResponse.json({ answer, sources });
  } catch (e) {
    console.error("multi-chat failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Chat failed" },
      { status: 500 },
    );
  }
}
