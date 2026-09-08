import { NextResponse } from "next/server";
import { requireUserOrResponse } from "@/lib/auth";
import { canChat, getAccessibleDocument } from "@/lib/access";
import { appendMessages, listMessages } from "@/lib/chat/store";
import {
  embedQuery,
  generateGroundedAnswer,
  isGeminiConfigured,
} from "@/lib/gemini";
import { isPineconeConfigured, querySimilar } from "@/lib/pinecone";
import {
  RERANK_KEEP,
  RETRIEVE_TOP_K,
  rerankChunks,
} from "@/lib/rerank";
import {
  NOT_IN_DOCUMENT_ANSWER,
  assessGroundingSupport,
} from "@/lib/grounding";
import { RATE, rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { logEvent } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const user = await requireUserOrResponse();
    if (user instanceof Response) return user;

    const documentId = new URL(request.url).searchParams.get("documentId");
    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 },
      );
    }

    const access = await getAccessibleDocument(documentId, user);
    if (!access) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const messages = await listMessages(documentId, user.id);
    return NextResponse.json({
      messages,
      document: access.document,
      accessRole: access.role,
    });
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
    const user = await requireUserOrResponse();
    if (user instanceof Response) return user;

    const limited = rateLimit(
      `chat:${user.id}`,
      RATE.chat.limit,
      RATE.chat.windowMs,
    );
    if (!limited.ok) {
      return NextResponse.json(
        {
          error: `Chat rate limit exceeded. Try again in ${limited.retryAfterSec}s.`,
        },
        { status: 429, headers: rateLimitHeaders(limited) },
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
      documentId?: string;
      question?: string;
    } | null;

    if (!body?.documentId || !body?.question?.trim()) {
      return NextResponse.json(
        { error: "documentId and question are required" },
        { status: 400 },
      );
    }

    const access = await getAccessibleDocument(body.documentId, user);
    if (!access || !canChat(access.role)) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }
    const doc = access.document;
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
    const t0 = Date.now();

    const tEmbed = Date.now();
    const vector = await embedQuery(question);
    const embedMs = Date.now() - tEmbed;

    // Always query the owner's Pinecone namespace (sharing must not use grantee ns).
    const namespace = doc.pineconeNs;
    const tPine = Date.now();
    const matches = await querySimilar(
      namespace,
      vector,
      RETRIEVE_TOP_K,
      doc.id,
    );
    const pineconeMs = Date.now() - tPine;

    const usable = matches.filter((m) => m.chunkText && m.score > 0.15);
    const tRerank = Date.now();
    const ranked = await rerankChunks(question, usable, RERANK_KEEP);
    const rerankMs = Date.now() - tRerank;

    let answer: string;
    let sources: {
      chunkText: string;
      page: number | null;
      filename: string;
    }[] = [];
    let generateMs = 0;

    const support = assessGroundingSupport(question, ranked);
    if (!support.ok) {
      answer = NOT_IN_DOCUMENT_ANSWER;
    } else {
      sources = ranked.map((m) => ({
        chunkText: m.chunkText,
        page: m.page,
        filename: m.filename || doc.filename,
      }));
      const tGen = Date.now();
      answer = await generateGroundedAnswer(
        question,
        sources.map((s) => ({
          text: s.chunkText,
          page: s.page,
          filename: s.filename,
        })),
      );
      generateMs = Date.now() - tGen;
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

    const timings = {
      embedMs,
      pineconeMs,
      rerankMs,
      generateMs,
      totalMs: Date.now() - t0,
    };

    logEvent("chat.complete", {
      userId: user.id,
      documentId: doc.id,
      grounded: support.ok,
      sourceCount: sources.length,
      ...timings,
    });

    return NextResponse.json(
      { answer, sources, timings },
      { headers: rateLimitHeaders(limited) },
    );
  } catch (e) {
    console.error("POST /api/chat failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Chat failed" },
      { status: 500 },
    );
  }
}
