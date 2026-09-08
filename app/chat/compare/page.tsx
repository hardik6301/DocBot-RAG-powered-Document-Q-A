"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Icon from "@/components/ui/Icon";
import SourceCard from "@/components/chat/SourceCard";
import ChatInput from "@/components/chat/ChatInput";
import ComparisonTable from "@/components/chat/ComparisonTable";
import type { AppDocument, SourceCitation } from "@/types";

type CompareSource = SourceCitation & { docId?: string; label?: string };

type CompareTableData = {
  headers: string[];
  rows: { aspect: string; values: string[] }[];
};

type Result = {
  question: string;
  table: CompareTableData | null;
  differences: string;
  sources: CompareSource[];
};

export default function ComparePage() {
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch("/api/chat/compare", {
          credentials: "same-origin",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        const docs = (data.documents as AppDocument[]) ?? [];
        setDocuments(docs);
        setSelected(docs.slice(0, 2).map((d) => d.id));
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const onSend = async (text: string) => {
    if (selected.length < 2) {
      setError("Select at least 2 documents");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/chat/compare", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          documentIds: selected,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Compare failed");
      setResult({
        question: text,
        table: (data.table as CompareTableData) ?? null,
        differences: String(data.differences ?? ""),
        sources: (data.sources as CompareSource[]) ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compare failed");
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <div className="bg-background">
        <Navbar variant="app" />
        <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 pt-16 text-center">
          <Icon name="compare" className="mb-3 text-[40px] text-primary" />
          <h1 className="text-headline-lg text-on-surface">Compare documents</h1>
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
              Compare
            </span>
            <h1 className="mt-3 text-headline-lg-mobile text-on-surface">
              Document comparison
            </h1>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Pick 2–4 ready docs. Retrieval runs per document, then a structured
              comparison is built — not a merged chunk soup.
            </p>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-stack-md">
            {loading ? (
              <p className="text-body-sm text-on-surface-variant">Loading…</p>
            ) : documents.length < 2 ? (
              <p className="text-body-sm text-on-surface-variant">
                Need at least 2 ready documents. Upload more from the dashboard.
              </p>
            ) : (
              documents.map((d) => {
                const selectedIndex = selected.indexOf(d.id);
                const letter =
                  selectedIndex >= 0
                    ? String.fromCharCode(65 + selectedIndex)
                    : null;
                return (
                  <label
                    key={d.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-outline-variant bg-white px-3 py-2.5 transition-colors hover:bg-surface-container-low"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(d.id)}
                      onChange={() => toggle(d.id)}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        {letter ? (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            {letter}
                          </span>
                        ) : null}
                        <span className="block truncate text-body-sm font-medium text-on-surface">
                          {d.filename}
                        </span>
                      </span>
                      <span className="text-xs text-on-surface-variant">
                        {d.chunkCount ?? 0} chunks
                      </span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </aside>

        <section className="relative flex flex-1 flex-col bg-surface">
          <div className="z-10 flex items-center justify-between border-b border-outline-variant bg-white/80 px-stack-lg py-3 backdrop-blur-md">
            <div className="flex items-center gap-stack-sm">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-body-sm font-medium text-on-surface">
                Comparing {selected.length} document
                {selected.length === 1 ? "" : "s"}
              </span>
            </div>
            <Link
              href="/chat/multi"
              className="text-body-sm font-medium text-primary"
            >
              Multi-doc Q&A
            </Link>
          </div>

          <div className="flex-1 space-y-stack-lg overflow-y-auto px-4 pb-48 pt-stack-lg md:px-stack-lg">
            {!result && !busy && (
              <div className="rounded-2xl border border-dashed border-outline-variant bg-white/60 px-5 py-8 text-center">
                <Icon
                  name="compare"
                  className="mx-auto mb-3 text-[36px] text-primary"
                />
                <p className="text-body-md font-medium text-on-surface">
                  Ask a comparison question
                </p>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  e.g. “Compare experience requirements and AWS skills”
                </p>
              </div>
            )}

            {busy && (
              <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-outline" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-outline [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-outline [animation-delay:0.4s]" />
                Retrieving per document and building comparison…
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-error/30 bg-error-container/40 px-3 py-2 text-body-sm text-error">
                {error}
              </p>
            )}

            {result && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-primary px-4 py-3 text-chat-bubble text-on-primary shadow-sm">
                    {result.question}
                  </div>
                </div>
                <ComparisonTable
                  table={result.table}
                  differences={result.differences}
                />
                {result.sources.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-outline">
                      Comparative citations
                    </p>
                    <div className="no-scrollbar -mx-2 flex gap-stack-sm overflow-x-auto px-2 pb-2">
                      {result.sources.map((s, i) => (
                        <SourceCard
                          key={`${s.label}-${i}`}
                          index={s.label || String(i + 1).padStart(2, "0")}
                          page={
                            s.page != null
                              ? `${s.filename} · p.${s.page}`
                              : s.filename
                          }
                          excerpt={s.chunkText}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <ChatInput
            onSend={onSend}
            disabled={busy || selected.length < 2}
            placeholder={
              selected.length < 2
                ? "Select at least 2 documents…"
                : "What should we compare?"
            }
          />
        </section>
      </main>
    </div>
  );
}
