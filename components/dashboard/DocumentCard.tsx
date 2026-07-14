"use client";

import Link from "next/link";
import Icon from "@/components/ui/Icon";
import type { AppDocument } from "@/types";

type Props = {
  doc: AppDocument;
  onDelete?: (id: string) => void;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function iconFor(type: string) {
  if (type === "pdf")
    return {
      icon: "description",
      iconBg: "bg-[#FFDAD6]",
      iconColor: "text-[#BA1A1A]",
    };
  if (type === "ppt")
    return {
      icon: "present_to_all",
      iconBg: "bg-secondary-fixed",
      iconColor: "text-primary",
    };
  return {
    icon: "article",
    iconBg: "bg-[#E0E3E5]",
    iconColor: "text-on-surface-variant",
  };
}

export default function DocumentCard({ doc, onDelete }: Props) {
  const ready = doc.status === "ready";
  const processing = doc.status === "processing";
  const visual = iconFor(doc.fileType);

  return (
    <article className="doc-card flex h-64 flex-col justify-between rounded-xl border border-outline-variant bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft">
      <div>
        <div className="mb-4 flex items-start justify-between">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${visual.iconBg}`}
          >
            <Icon name={visual.icon} className={visual.iconColor} />
          </div>
          <span
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
              ready
                ? "bg-emerald-100 text-emerald-800"
                : processing
                  ? "animate-pulse bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-800"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                ready
                  ? "bg-emerald-500"
                  : processing
                    ? "bg-amber-500"
                    : "bg-rose-500"
              }`}
            />
            {doc.status}
          </span>
        </div>
        <h3
          className="mb-1 truncate text-[18px] font-semibold leading-tight text-on-surface"
          title={doc.filename}
        >
          {doc.filename}
        </h3>
        <div className="flex items-center gap-3 text-body-sm text-on-surface-variant">
          <span>Uploaded {formatDate(doc.createdAt)}</span>
          <span className="h-1 w-1 rounded-full bg-outline-variant" />
          <span>
            {doc.pageCount != null ? `${doc.pageCount} Pages` : "—"}
          </span>
        </div>
      </div>

      <div
        className={`mt-auto flex items-center justify-between border-t border-outline-variant pt-4 ${
          !ready ? "pointer-events-none opacity-50" : ""
        }`}
      >
        <Link
          href={`/chat/${doc.id}`}
          className="flex items-center gap-2 font-semibold text-primary transition-all hover:gap-3"
        >
          Ask Questions
          <Icon name="arrow_forward" className="text-[18px]" />
        </Link>
        <button
          type="button"
          onClick={() => onDelete?.(doc.id)}
          className="rounded p-1 text-outline transition-colors hover:text-error"
          aria-label="Delete document"
        >
          <Icon name="delete" />
        </button>
      </div>
    </article>
  );
}
