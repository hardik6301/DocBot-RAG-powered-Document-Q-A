import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listChatsForUser } from "@/lib/chat/store";
import { listDocuments } from "@/lib/documents/store";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.isPro) {
    return NextResponse.json(
      { error: "Analytics is a Pro feature." },
      { status: 403 },
    );
  }

  const [chats, documents] = await Promise.all([
    listChatsForUser(user.id),
    listDocuments(user.id),
  ]);

  const docName = new Map(documents.map((d) => [d.id, d.filename]));
  const questions: { text: string; documentId: string; createdAt: string }[] =
    [];
  let assistantCount = 0;
  let citationCount = 0;

  for (const chat of chats) {
    for (const m of chat.messages) {
      if (m.role === "user") {
        questions.push({
          text: m.content,
          documentId: chat.documentId,
          createdAt: m.createdAt,
        });
      } else {
        assistantCount += 1;
        citationCount += m.sources?.length ?? 0;
      }
    }
  }

  const freq = new Map<string, number>();
  for (const q of questions) {
    const key = q.text.trim().toLowerCase();
    if (!key) continue;
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }

  const topQuestions = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([text, count]) => ({ text, count }));

  const byDocument = documents.map((d) => {
    const chat = chats.find((c) => c.documentId === d.id);
    const qCount =
      chat?.messages.filter((m) => m.role === "user").length ?? 0;
    return {
      id: d.id,
      filename: d.filename,
      status: d.status,
      questions: qCount,
      chunks: d.chunkCount ?? 0,
    };
  });

  const recent = [...questions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 15)
    .map((q) => ({
      ...q,
      filename:
        q.documentId === "__multi__"
          ? "Multi-document"
          : docName.get(q.documentId) ?? "Unknown",
    }));

  return NextResponse.json({
    summary: {
      documents: documents.length,
      readyDocuments: documents.filter((d) => d.status === "ready").length,
      totalQuestions: questions.length,
      totalAnswers: assistantCount,
      totalCitations: citationCount,
    },
    topQuestions,
    byDocument,
    recent,
  });
}
