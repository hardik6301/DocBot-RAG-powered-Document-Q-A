"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import type { SourceCitation } from "@/types";
import { highlightExcerptSegments, normalizeForMatch } from "@/lib/citations";

type Props = {
  documentId: string;
  fileType: string;
  citationIndex: number;
  source: SourceCitation;
  onClose: () => void;
};

function PassagePanel({ source }: { source: SourceCitation }) {
  const segments = useMemo(() => {
    const text = source.chunkText;
    const probe = text.slice(
      Math.max(0, Math.floor(text.length * 0.15)),
      Math.min(text.length, Math.floor(text.length * 0.15) + 90),
    );
    return highlightExcerptSegments(text, probe.trim() || text.slice(0, 80));
  }, [source.chunkText]);

  return (
    <blockquote className="rounded-xl border border-primary/20 bg-primary-fixed/30 px-4 py-3 text-[13px] leading-relaxed text-on-surface">
      {segments.map((s, i) =>
        s.hit ? (
          <mark
            key={i}
            className="rounded-sm bg-amber-200/90 px-0.5 text-on-surface"
          >
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </blockquote>
  );
}

function PdfPageViewer({
  fileUrl,
  page,
  highlightText,
}: {
  fileUrl: string;
  page: number;
  highlightText: string;
}) {
  const [mods, setMods] = useState<{
    Document: typeof import("react-pdf").Document;
    Page: typeof import("react-pdf").Page;
  } | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const needle = useMemo(
    () => normalizeForMatch(highlightText).slice(0, 120),
    [highlightText],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const mod = await import("react-pdf");
        mod.pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        await Promise.all([
          // @ts-expect-error CSS side-effect import
          import("react-pdf/dist/esm/Page/TextLayer.css"),
          // @ts-expect-error CSS side-effect import
          import("react-pdf/dist/esm/Page/AnnotationLayer.css"),
        ]);
        if (!cancelled) {
          setMods({ Document: mod.Document, Page: mod.Page });
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Failed to load PDF viewer",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-body-sm text-rose-800">
        {error}
      </div>
    );
  }
  if (!mods) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-low text-body-sm text-on-surface-variant">
        Loading page…
      </div>
    );
  }

  const { Document, Page } = mods;
  const pageNumber = Math.max(1, Math.min(page, numPages || page));

  return (
    <div className="cite-pdf-viewer overflow-auto rounded-xl border border-outline-variant bg-[#F3F4F6]">
      <Document
        file={fileUrl}
        loading={
          <div className="flex h-64 items-center justify-center text-body-sm text-on-surface-variant">
            Opening PDF…
          </div>
        }
        onLoadSuccess={(info) => setNumPages(info.numPages)}
        onLoadError={(e) => setError(e.message)}
        className="flex justify-center p-3"
      >
        <Page
          pageNumber={pageNumber}
          width={440}
          renderAnnotationLayer
          renderTextLayer
          customTextRenderer={({ str }) => {
            if (!needle) return str;
            const norm = normalizeForMatch(str);
            if (!norm) return str;
            const tokens = needle.split(" ").filter((t) => t.length > 4);
            const hit =
              (norm.length >= 4 && needle.includes(norm)) ||
              tokens.some((t) => norm.includes(t));
            if (!hit) return str;
            return `<mark class="cite-hit">${str}</mark>`;
          }}
        />
      </Document>
    </div>
  );
}

export default function SourceViewer({
  documentId,
  fileType,
  citationIndex,
  source,
  onClose,
}: Props) {
  const fileUrl = `/api/documents/${documentId}/file`;
  const isPdf = fileType === "pdf";
  const page = source.page && source.page > 0 ? source.page : 1;

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-outline-variant bg-surface-container-lowest md:w-[28rem] lg:w-[30rem]">
      <div className="flex items-start justify-between gap-3 border-b border-outline-variant px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
            Source [{citationIndex}]
          </p>
          <h2
            className="truncate text-base font-semibold text-on-surface"
            title={source.filename}
          >
            {source.filename}
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            {source.page != null ? `Page ${source.page}` : "Passage"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-outline hover:bg-surface-container hover:text-on-surface"
          aria-label="Close source viewer"
        >
          <Icon name="close" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            Retrieved passage
          </p>
          <PassagePanel source={source} />
        </div>

        {isPdf ? (
          <div>
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              Document · page {page}
            </p>
            <PdfPageViewer
              fileUrl={fileUrl}
              page={page}
              highlightText={source.chunkText}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-outline-variant bg-white p-4 text-body-sm text-on-surface-variant">
            Inline page preview is available for PDFs. This file type (
            {fileType.toUpperCase()}) shows the grounded passage above so you
            can verify the quote.
          </div>
        )}

        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary hover:underline"
        >
          <Icon name="open_in_new" className="text-[16px]" />
          Open original file
        </a>
      </div>
    </aside>
  );
}
