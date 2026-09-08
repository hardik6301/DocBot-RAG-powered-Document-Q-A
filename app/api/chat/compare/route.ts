import { NextResponse } from "next/server";
import { requireUserOrResponse } from "@/lib/auth";
import { listDocuments, getDocument } from "@/lib/documents/store";
import {
  embedQuery,
  isGeminiConfigured,
} from "@/lib/gemini";
import { isPineconeConfigured, querySimilar } from "@/lib/pinecone";
import { rerankChunks } from "@/lib/rerank";
import { generateDocumentComparison } from "@/lib/compare";
import type { SourceCitation } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const PER_DOC_RETRIEVE = 10;
const PER_DOC_KEEP = 4;

export async function GET() {
  const user = await requireUserOrResponse();
  if (user instanceof Response) return user;

  try {
    const allDocs = await listDocuments(user.id);
    const documents = allDocs.filter(
      (d) => d.status === "ready" && (d.chunkCount ?? 0) > 0,
    );
    return NextResponse.json({ documents });
  } catch (e) {
    console.error("GET /api/chat/compare failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await requireUserOrResponse();
  if (user instanceof Response) return user;

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
  if (!body.documentIds || body.documentIds.length < 2) {
    return NextResponse.json(
      { error: "Select at least 2 documents to compare" },
      { status: 400 },
    );
  }
  if (body.documentIds.length > 4) {
    return NextResponse.json(
      { error: "Compare at most 4 documents at a time" },
      { status: 400 },
    );
  }

  try {
    const question = body.question.trim();
    const namespace = user.supabaseId || user.id;
    const vector = await embedQuery(question);

    const docs = [];
    const sources: (SourceCitation & { docId: string; label: string })[] = [];

    for (let i = 0; i < body.documentIds.length; i++) {
      const id = body.documentIds[i];
      const doc = await getDocument(id, user.id);
      if (!doc || doc.status !== "ready" || !(doc.chunkCount && doc.chunkCount > 0)) {
        return NextResponse.json(
          { error: `Document not ready: ${id}` },
          { status: 400 },
        );
      }
      const letter = String.fromCharCode(65 + i);
      const matches = await querySimilar(
        namespace,
        vector,
        PER_DOC_RETRIEVE,
        doc.id,
      );
      const usable = matches.filter((m) => m.chunkText && m.score > 0.12);
      const ranked = await rerankChunks(question, usable, PER_DOC_KEEP);

      docs.push({
        docId: doc.id,
        filename: doc.filename,
        chunks: ranked.map((m) => ({
          text: m.chunkText,
          page: m.page,
        })),
      });

      for (let j = 0; j < ranked.length; j++) {
        const m = ranked[j];
        sources.push({
          docId: doc.id,
          label: `${letter}${j + 1}`,
          chunkText: m.chunkText,
          page: m.page,
          filename: doc.filename,
        });
      }
    }

    const comparison = await generateDocumentComparison({
      question,
      documents: docs,
    });

    return NextResponse.json({
      answer: comparison.answer,
      differences: comparison.differences,
      table: comparison.table,
      sources,
      documents: docs.map((d, i) => ({
        id: d.docId,
        filename: d.filename,
        label: String.fromCharCode(65 + i),
      })),
    });
  } catch (e) {
    console.error("POST /api/chat/compare failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Compare failed" },
      { status: 500 },
    );
  }
}
