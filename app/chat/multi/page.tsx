"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Icon from "@/components/ui/Icon";
import SourceCard from "@/components/chat/SourceCard";
import ChatInput from "@/components/chat/ChatInput";
import ExportChatButton from "@/components/chat/ExportChatButton";
import type { AppDocument, SourceCitation, StoredMessage } from "@/types";

type UiMessage = StoredMessage & { typing?: boolean };

const WELCOME: UiMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Ask across all your ready documents. I’ll retrieve the best chunks from every selected file and cite sources.",
  createdAt: new Date(0).toISOString(),
};

export default function MultiChatPage() {
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<UiMessage[]>([WELCOME]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch("/api/chat/multi");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        const docs = (data.documents as AppDocument[]) ?? [];
        setDocuments(docs);
        setSelected(new Set(docs.map((d) => d.id)));
        const history = (data.messages as StoredMessage[]) ?? [];
        setMessages(history.length ? history : [WELCOME]);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
      const res = await fetch("/api/chat/multi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          documentIds: Array.from(selected),
        }),
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

  if (loadError) {
    return (
      <div className="bg-background">
        <Navbar variant="app" />
        <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 pt-16 text-center">
          <Icon name="workspace_premium" className="mb-3 text-[40px] text-primary" />
          <h1 className="text-headline-lg text-on-surface">Multi-document Q&A</h1>
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
            <span className="rounded bg-primary-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-primary-container">
              Multi-doc
            </span>
            <h1 className="mt-3 text-headline-lg-mobile text-on-surface">
              Ask across files
            </h1>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Select which ready documents to include.
            </p>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-stack-md">
            {loading ? (
              <p className="text-body-sm text-on-surface-variant">Loading…</p>
            ) : documents.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">
                No ready documents yet. Upload and wait for indexing.
              </p>
            ) : (
              documents.map((d) => (
                <label
                  key={d.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-outline-variant bg-white px-3 py-2.5 transition-colors hover:bg-surface-container-low"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(d.id)}
                    onChange={() => toggle(d.id)}
                    className="mt-1"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-body-sm font-medium text-on-surface">
                      {d.filename}
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {d.chunkCount ?? 0} chunks
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        </aside>

        <section className="relative flex flex-1 flex-col bg-surface">
          <div className="z-10 flex items-center justify-between border-b border-outline-variant bg-white/80 px-stack-lg py-3 backdrop-blur-md">
            <div className="flex items-center gap-stack-sm">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-body-sm font-medium text-on-surface">
                Searching {selected.size} document{selected.size === 1 ? "" : "s"}
              </span>
            </div>
            <ExportChatButton
              messages={messages}
              title="Multi-document chat"
              disabled={loading}
            />
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
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-none border border-outline-variant bg-white px-5 py-3 shadow-sm">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-outline" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-outline [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-outline [animation-delay:0.4s]" />
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex w-full justify-start">
                  <div className="max-w-[95%] space-y-4 md:max-w-[85%]">
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
                              s.page != null
                                ? `${s.filename} · p.${s.page}`
                                : s.filename
                            }
                            excerpt={s.chunkText}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}
            <div ref={bottomRef} />
          </div>

          <ChatInput onSend={onSend} disabled={selected.size === 0} />
        </section>
      </main>
    </div>
  );
}
