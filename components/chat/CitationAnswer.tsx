"use client";

import type { SourceCitation } from "@/types";
import { sourceForIndex, splitCitationMarkers } from "@/lib/citations";

type Props = {
  content: string;
  sources?: SourceCitation[] | null;
  activeIndex?: number | null;
  onCite?: (index: number, source: SourceCitation) => void;
};

export default function CitationAnswer({
  content,
  sources,
  activeIndex,
  onCite,
}: Props) {
  const parts = splitCitationMarkers(content);

  return (
    <div className="whitespace-pre-wrap text-chat-bubble leading-relaxed text-on-surface">
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.value}</span>;
        }
        const source = sourceForIndex(sources, part.index);
        const active = activeIndex === part.index;
        if (!source || !onCite) {
          return (
            <span
              key={i}
              className="mx-0.5 inline-flex translate-y-[-1px] items-center rounded bg-primary-fixed/70 px-1.5 py-0.5 text-[11px] font-bold text-primary"
            >
              {part.raw}
            </span>
          );
        }
        return (
          <button
            key={i}
            type="button"
            onClick={() => onCite(part.index, source)}
            className={`mx-0.5 inline-flex translate-y-[-1px] items-center rounded px-1.5 py-0.5 text-[11px] font-bold transition-colors ${
              active
                ? "bg-primary text-on-primary ring-2 ring-primary/30"
                : "bg-primary-fixed text-primary hover:bg-primary hover:text-on-primary"
            }`}
            title={
              source.page != null
                ? `${source.filename} · Page ${source.page}`
                : source.filename
            }
            aria-label={`Open source ${part.index}`}
          >
            {part.raw}
          </button>
        );
      })}
    </div>
  );
}
