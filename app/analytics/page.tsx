"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Icon from "@/components/ui/Icon";

type AnalyticsPayload = {
  summary: {
    documents: number;
    readyDocuments: number;
    totalQuestions: number;
    totalAnswers: number;
    totalCitations: number;
  };
  topQuestions: { text: string; count: number }[];
  byDocument: {
    id: string;
    filename: string;
    status: string;
    questions: number;
    chunks: number;
  }[];
  recent: {
    text: string;
    filename: string;
    createdAt: string;
  }[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/analytics");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load analytics");
        setData(json as AnalyticsPayload);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-[100dvh] bg-surface">
      <Navbar variant="app" />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-24 md:px-container-padding">
        <header className="mb-stack-lg">
          <h1 className="text-headline-xl text-on-surface">Analytics</h1>
          <p className="mt-1 text-on-surface-variant">
            Top questions and usage across your document chats.
          </p>
        </header>

        {loading && (
          <div className="h-40 animate-pulse rounded-xl bg-surface-container-low" />
        )}

        {error && (
          <div className="rounded-xl border border-outline-variant bg-white px-6 py-10 text-center">
            <Icon name="workspace_premium" className="mb-3 text-[40px] text-primary" />
            <p className="text-body-md text-on-surface">{error}</p>
            <Link
              href="/dashboard"
              className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary"
            >
              Back to dashboard
            </Link>
          </div>
        )}

        {data && (
          <div className="space-y-stack-lg">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {(
                [
                  ["Documents", data.summary.documents],
                  ["Ready", data.summary.readyDocuments],
                  ["Questions", data.summary.totalQuestions],
                  ["Answers", data.summary.totalAnswers],
                  ["Citations", data.summary.totalCitations],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-outline-variant bg-white px-4 py-5"
                >
                  <p className="font-mono text-label-caps text-on-surface-variant">
                    {label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-on-surface">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <section className="rounded-xl border border-outline-variant bg-white p-6">
              <h2 className="text-headline-lg text-on-surface">Top questions</h2>
              {data.topQuestions.length === 0 ? (
                <p className="mt-3 text-body-sm text-on-surface-variant">
                  Ask questions in chat to see insights here.
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {data.topQuestions.map((q, i) => (
                    <li
                      key={`${q.text}-${i}`}
                      className="flex items-start justify-between gap-4 border-b border-outline-variant/60 pb-3 last:border-0"
                    >
                      <span className="text-body-md text-on-surface">
                        <span className="mr-2 font-mono text-label-caps text-outline">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {q.text}
                      </span>
                      <span className="shrink-0 font-mono text-label-caps text-primary">
                        ×{q.count}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="rounded-xl border border-outline-variant bg-white p-6">
              <h2 className="text-headline-lg text-on-surface">By document</h2>
              <div className="mt-4 space-y-2">
                {data.byDocument.map((d) => (
                  <div
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-container-low px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-medium text-on-surface">
                        {d.filename}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {d.status} · {d.chunks} chunks
                      </p>
                    </div>
                    <p className="font-mono text-label-caps text-on-surface-variant">
                      {d.questions} questions
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-outline-variant bg-white p-6">
              <h2 className="text-headline-lg text-on-surface">Recent questions</h2>
              <ul className="mt-4 space-y-3">
                {data.recent.map((q, i) => (
                  <li key={`${q.createdAt}-${i}`} className="text-body-sm">
                    <p className="text-on-surface">{q.text}</p>
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                      {q.filename} · {new Date(q.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
                {data.recent.length === 0 && (
                  <p className="text-on-surface-variant">No questions yet.</p>
                )}
              </ul>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
