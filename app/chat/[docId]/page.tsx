"use client";

import { useEffect, useState, type ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";
import Icon from "@/components/ui/Icon";
import SourceCard from "@/components/chat/SourceCard";
import ChatInput from "@/components/chat/ChatInput";
import type { AppDocument, SourceCitation } from "@/types";

type Msg =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      content: ReactNode;
      sources?: SourceCitation[];
      typing?: boolean;
    };

export default function ChatPage({ params }: { params: { docId: string } }) {
  const [doc, setDoc] = useState<AppDocument | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Ask anything about this document. Answers will be grounded in retrieved chunks once RAG (Phase 3–4) is connected.",
    },
  ]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/documents/${params.docId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Document not found");
        setDoc(data.document);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, [params.docId]);

  const onSend = async (text: string) => {
    const userMsg: Msg = {
      id: String(Date.now()),
      role: "user",
      content: text,
    };
    const typingId = String(Date.now() + 1);
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: typingId, role: "assistant", content: null, typing: true },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: params.docId, question: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat failed");

      setMessages((prev) =>
        prev
          .filter((m) => m.id !== typingId)
          .concat({
            id: String(Date.now() + 2),
            role: "assistant",
            content: data.answer as string,
            sources: data.sources as SourceCitation[] | undefined,
          }),
      );
    } catch (e) {
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== typingId)
          .concat({
            id: String(Date.now() + 3),
            role: "assistant",
            content:
              e instanceof Error ? e.message : "Something went wrong asking.",
          }),
      );
    }
  };

  const title = doc?.filename ?? "Loading…";

  return (
    <div className="bg-background text-on-background">
      <Navbar variant="app" />

      <main className="flex h-[100dvh] overflow-hidden pt-16">
        <aside className="hidden w-80 shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest md:flex">
          <div className="border-b border-outline-variant p-stack-md">
            <div className="mb-stack-sm flex items-start justify-between">
              <span className="rounded bg-primary-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-primary-container">
                {doc?.fileType?.toUpperCase() || "DOC"} Document
              </span>
            </div>
            <h1 className="mb-1 text-headline-lg-mobile leading-tight text-on-surface">
              {title}
            </h1>
            <p className="flex items-center gap-1 text-body-sm text-on-surface-variant">
              <Icon name="description" className="text-[16px]" />
              {doc
                ? `${doc.pageCount ?? "—"} Pages • ${doc.status}`
                : loadError || "Loading…"}
            </p>
          </div>

          <div className="flex-1 space-y-stack-md overflow-y-auto p-stack-md">
            <div className="aspect-[3/4] overflow-hidden rounded-lg border border-outline-variant bg-white shadow-sm">
              <div className="flex h-full flex-col gap-2 bg-gradient-to-b from-surface-container-low to-white p-6">
                <div className="h-3 w-2/3 rounded bg-surface-container" />
                <div className="mt-4 h-2 w-full rounded bg-surface-container-high/80" />
                <div className="h-2 w-5/6 rounded bg-surface-container-high/60" />
                <div className="mt-auto h-24 rounded-lg border border-dashed border-outline-variant bg-surface-container-low" />
              </div>
            </div>
          </div>
        </aside>

        <section className="relative flex flex-1 flex-col bg-surface">
          <div className="z-10 flex items-center justify-between border-b border-outline-variant bg-white/80 px-stack-lg py-3 backdrop-blur-md">
            <div className="flex items-center gap-stack-sm">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-body-sm font-medium text-on-surface">
                AI Analyst Online
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-stack-lg overflow-y-auto px-4 pb-48 pt-stack-lg md:px-stack-lg">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex w-full justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-primary px-4 py-3 text-chat-bubble text-on-primary shadow-sm md:max-w-[70%]">
                    {m.content}
                  </div>
                </div>
              ) : m.typing ? (
                <div key={m.id} className="flex w-full justify-start">
                  <div className="flex max-w-[85%] gap-4">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container">
                      <Icon
                        name="smart_toy"
                        className="text-[20px] text-white"
                        filled
                      />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-none border border-outline-variant bg-white px-5 py-3 shadow-sm">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-outline" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-outline [animation-delay:0.2s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-outline [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex w-full justify-start">
                  <div className="flex max-w-[95%] gap-4 md:max-w-[85%]">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container">
                      <Icon
                        name="smart_toy"
                        className="text-[20px] text-white"
                        filled
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="rounded-2xl rounded-tl-none border border-outline-variant bg-white px-5 py-4 text-chat-bubble leading-relaxed text-on-surface shadow-sm">
                        {m.content}
                      </div>
                      {m.sources && m.sources.length > 0 && (
                        <div className="no-scrollbar -mx-2 flex gap-stack-sm overflow-x-auto px-2 pb-2">
                          {m.sources.map((s, i) => (
                            <SourceCard
                              key={`${s.filename}-${i}`}
                              index={String(i + 1).padStart(2, "0")}
                              page={
                                s.page != null ? `Page ${s.page}` : "Source"
                              }
                              excerpt={s.chunkText}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>

          <ChatInput onSend={onSend} />
        </section>
      </main>
    </div>
  );
}
