"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Icon from "@/components/ui/Icon";
import SourceCard from "@/components/chat/SourceCard";
import ChatInput from "@/components/chat/ChatInput";
import type { AppDocument, SourceCitation, StoredMessage } from "@/types";

type UiMessage = StoredMessage & { typing?: boolean };

const WELCOME: UiMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Ask anything about this document. Answers are grounded in retrieved chunks with source citations.",
  createdAt: new Date(0).toISOString(),
};

export default function ChatPage({ params }: { params: { docId: string } }) {
  const [doc, setDoc] = useState<AppDocument | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<UiMessage[]>([WELCOME]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(
          `/api/chat?documentId=${encodeURIComponent(params.docId)}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load chat");
        setDoc(data.document);
        const history = (data.messages as StoredMessage[]) ?? [];
        setMessages(history.length ? history : [WELCOME]);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.docId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onSend = async (text: string) => {
    const typingId = `typing-${Date.now()}`;
    setMessages((prev) => [
      ...prev.filter((m) => m.id !== "welcome"),
      {
        id: `local-user-${Date.now()}`,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      },
      {
        id: typingId,
        role: "assistant",
        content: "",
        typing: true,
        createdAt: new Date().toISOString(),
      },
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
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: data.answer as string,
            sources: (data.sources as SourceCitation[]) ?? [],
            createdAt: new Date().toISOString(),
          }),
      );
    } catch (e) {
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== typingId)
          .concat({
            id: `error-${Date.now()}`,
            role: "assistant",
            content:
              e instanceof Error ? e.message : "Something went wrong asking.",
            createdAt: new Date().toISOString(),
          }),
      );
    }
  };

  const title = doc?.filename ?? (loading ? "Loading…" : "Document");

  if (loadError && !doc) {
    return (
      <div className="bg-background">
        <Navbar variant="app" />
        <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 pt-16 text-center">
          <Icon name="error" className="mb-3 text-[40px] text-error" />
          <h1 className="text-headline-lg text-on-surface">Chat unavailable</h1>
          <p className="mt-2 max-w-md text-body-md text-on-surface-variant">
            {loadError}
          </p>
          <Link
            href="/dashboard"
            className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary"
          >
            Back to dashboard
          </Link>
        </main>
      </div>
    );
  }

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
              <Link
                href="/dashboard"
                className="text-outline transition-colors hover:text-primary"
                aria-label="Back"
              >
                <Icon name="arrow_back" />
              </Link>
            </div>
            <h1 className="mb-1 text-headline-lg-mobile leading-tight text-on-surface">
              {title}
            </h1>
            <p className="flex items-center gap-1 text-body-sm text-on-surface-variant">
              <Icon name="description" className="text-[16px]" />
              {doc
                ? `${doc.pageCount ?? "—"} pages · ${doc.chunkCount ?? 0} chunks · ${doc.status}`
                : "Loading…"}
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
            {doc?.status === "ready" && (doc.chunkCount ?? 0) === 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-body-sm text-amber-900">
                This document has no indexed chunks. Re-upload after setting
                GEMINI_API_KEY.
              </p>
            )}
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
            <Link
              href="/dashboard"
              className="text-body-sm font-medium text-primary md:hidden"
            >
              Dashboard
            </Link>
          </div>

          <div className="flex-1 space-y-stack-lg overflow-y-auto px-4 pb-48 pt-stack-lg md:px-stack-lg">
            {loading ? (
              <div className="space-y-4">
                <div className="h-16 w-2/3 animate-pulse rounded-2xl bg-surface-container-low" />
                <div className="ml-auto h-12 w-1/2 animate-pulse rounded-2xl bg-primary/20" />
              </div>
            ) : (
              messages.map((m) =>
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
                        <div className="whitespace-pre-wrap rounded-2xl rounded-tl-none border border-outline-variant bg-white px-5 py-4 text-chat-bubble leading-relaxed text-on-surface shadow-sm">
                          {m.content}
                        </div>
                        {m.sources && m.sources.length > 0 && (
                          <div className="no-scrollbar -mx-2 flex gap-stack-sm overflow-x-auto px-2 pb-2">
                            {m.sources.map((s, i) => (
                              <SourceCard
                                key={`${m.id}-${i}`}
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
              )
            )}
            <div ref={bottomRef} />
          </div>

          <ChatInput onSend={onSend} />
        </section>
      </main>
    </div>
  );
}
