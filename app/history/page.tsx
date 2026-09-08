"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Icon from "@/components/ui/Icon";
import type { ChatSummary } from "@/types";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function hrefFor(chat: ChatSummary) {
  if (chat.kind === "multi") return "/chat/multi";
  if (chat.documentId) return `/chat/${chat.documentId}`;
  return "/dashboard";
}

export default function HistoryPage() {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/chats", { credentials: "same-origin" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load history");
      setChats((data.chats as ChatSummary[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => {
      const hay = [
        c.title ?? "",
        c.preview ?? "",
        c.documentFilename ?? "",
        c.kind,
      ]
        .join(" ")
        .toLowerCase();
      return q.split(/\s+/).every((t) => hay.includes(t));
    });
  }, [chats, query]);

  const rename = async (chat: ChatSummary) => {
    const next = window.prompt(
      "Rename chat",
      chat.title || chat.documentFilename || "Chat",
    );
    if (next == null || !next.trim()) return;
    const res = await fetch(`/api/chats/${chat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Rename failed");
      return;
    }
    setChats((prev) =>
      prev.map((c) =>
        c.id === chat.id ? { ...c, title: next.trim() } : c,
      ),
    );
  };

  return (
    <div className="min-h-[100dvh] bg-surface">
      <Navbar
        variant="app"
        searchQuery={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search chats…"
      />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-24 md:px-container-padding">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-headline-xl text-on-surface">Chat history</h1>
            <p className="mt-1 text-on-surface-variant">
              Resume document and multi-doc conversations.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-xl border border-outline-variant px-4 py-2 text-body-sm font-medium text-on-surface-variant hover:border-primary hover:text-primary"
          >
            Library
          </Link>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-error-container bg-error-container/40 px-4 py-3 text-body-sm text-on-error-container">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-outline-variant bg-surface-container-low"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low px-6 py-16 text-center">
            <Icon
              name="history"
              className="mb-3 text-[40px] text-outline-variant"
            />
            <h2 className="text-headline-lg text-on-surface">
              {chats.length === 0
                ? "No chats yet"
                : `No chats match “${query.trim()}”`}
            </h2>
            <p className="mt-2 text-body-md text-on-surface-variant">
              Ask a question on any ready document to start a thread.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((chat) => (
              <li
                key={chat.id}
                className="rounded-xl border border-outline-variant bg-white p-4 shadow-sm transition-shadow hover:shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded bg-surface-container px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                        {chat.kind === "multi" ? "Multi-doc" : "Document"}
                      </span>
                      <span className="text-[11px] text-outline">
                        {chat.messageCount} messages · {formatWhen(chat.updatedAt)}
                      </span>
                    </div>
                    <h2 className="truncate text-[17px] font-semibold text-on-surface">
                      {chat.title ||
                        chat.documentFilename ||
                        (chat.kind === "multi"
                          ? "Multi-document chat"
                          : "Untitled chat")}
                    </h2>
                    {chat.documentFilename && chat.kind === "document" && (
                      <p className="mt-0.5 truncate text-body-sm text-on-surface-variant">
                        {chat.documentFilename}
                      </p>
                    )}
                    {chat.preview && (
                      <p className="mt-2 line-clamp-2 text-body-sm text-on-surface-variant">
                        {chat.preview}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Link
                      href={hrefFor(chat)}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-body-sm font-semibold text-on-primary"
                    >
                      Open
                      <Icon name="arrow_forward" className="text-[16px]" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => void rename(chat)}
                      className="rounded-lg border border-outline-variant px-3 py-1.5 text-[12px] text-on-surface-variant hover:border-primary hover:text-primary"
                    >
                      Rename
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <Footer />
    </div>
  );
}
