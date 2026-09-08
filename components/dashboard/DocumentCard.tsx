"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import type { AppDocument } from "@/types";

type Props = {
  doc: AppDocument;
  folders: string[];
  onDelete?: (id: string) => void;
  onRename?: (id: string, filename: string) => Promise<void> | void;
  onArchive?: (id: string, archived: boolean) => Promise<void> | void;
  onMoveFolder?: (id: string, folder: string | null) => Promise<void> | void;
  onSetTags?: (id: string, tags: string[]) => Promise<void> | void;
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
  if (type === "md" || type === "markdown")
    return {
      icon: "code",
      iconBg: "bg-[#E8DEF8]",
      iconColor: "text-[#4A4458]",
    };
  if (type === "txt")
    return {
      icon: "notes",
      iconBg: "bg-[#E0E3E5]",
      iconColor: "text-on-surface-variant",
    };
  return {
    icon: "article",
    iconBg: "bg-[#E0E3E5]",
    iconColor: "text-on-surface-variant",
  };
}

export default function DocumentCard({
  doc,
  folders,
  onDelete,
  onRename,
  onArchive,
  onMoveFolder,
  onSetTags,
}: Props) {
  const ready = doc.status === "ready";
  const processing = doc.status === "processing";
  const failed = doc.status === "failed";
  const visual = iconFor(doc.fileType);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void> | void) => {
    setBusy(true);
    try {
      await fn();
      setMenuOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      className={`doc-card relative flex h-72 flex-col justify-between rounded-xl border bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft ${
        doc.archived
          ? "border-outline-variant/60 opacity-80"
          : "border-outline-variant"
      }`}
    >
      <div>
        <div className="mb-4 flex items-start justify-between gap-2">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${visual.iconBg}`}
          >
            <Icon name={visual.icon} className={visual.iconColor} />
          </div>
          <div className="flex items-center gap-1">
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
              {doc.archived ? "archived" : doc.status}
            </span>
            <div className="relative">
              <button
                type="button"
                disabled={busy}
                onClick={() => setMenuOpen((o) => !o)}
                className="rounded p-1 text-outline transition-colors hover:text-primary disabled:opacity-50"
                aria-label="Document actions"
              >
                <Icon name="more_vert" />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10 cursor-default"
                    aria-label="Close menu"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-outline-variant bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm hover:bg-surface-container"
                      onClick={() =>
                        void run(async () => {
                          const next = window.prompt(
                            "Rename document",
                            doc.filename,
                          );
                          if (next == null || !next.trim()) return;
                          await onRename?.(doc.id, next.trim());
                        })
                      }
                    >
                      <Icon name="edit" className="text-[18px]" />
                      Rename
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm hover:bg-surface-container"
                      onClick={() =>
                        void run(async () => {
                          const suggestion = folders[0] ?? "";
                          const next = window.prompt(
                            "Folder name (empty = Unfiled)",
                            doc.folder ?? suggestion,
                          );
                          if (next == null) return;
                          await onMoveFolder?.(doc.id, next.trim() || null);
                        })
                      }
                    >
                      <Icon name="folder" className="text-[18px]" />
                      Move to folder
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm hover:bg-surface-container"
                      onClick={() =>
                        void run(async () => {
                          const next = window.prompt(
                            "Tags (comma-separated)",
                            (doc.tags ?? []).join(", "),
                          );
                          if (next == null) return;
                          const tags = next
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean);
                          await onSetTags?.(doc.id, tags);
                        })
                      }
                    >
                      <Icon name="sell" className="text-[18px]" />
                      Edit tags
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm hover:bg-surface-container"
                      onClick={() =>
                        void run(async () => {
                          await onArchive?.(doc.id, !doc.archived);
                        })
                      }
                    >
                      <Icon
                        name={doc.archived ? "unarchive" : "archive"}
                        className="text-[18px]"
                      />
                      {doc.archived ? "Unarchive" : "Archive"}
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm text-error hover:bg-error/5"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete?.(doc.id);
                      }}
                    >
                      <Icon name="delete" className="text-[18px]" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <h3
          className="mb-1 truncate text-[18px] font-semibold leading-tight text-on-surface"
          title={doc.filename}
        >
          {doc.filename}
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-body-sm text-on-surface-variant">
          <span>Uploaded {formatDate(doc.createdAt)}</span>
          <span className="h-1 w-1 rounded-full bg-outline-variant" />
          <span>
            {doc.pageCount != null ? `${doc.pageCount} Pages` : "—"}
          </span>
        </div>
        {(doc.folder || (doc.tags && doc.tags.length > 0)) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {doc.folder && (
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-container px-2 py-0.5 text-[11px] text-on-surface-variant">
                <Icon name="folder" className="text-[14px]" />
                {doc.folder}
              </span>
            )}
            {(doc.tags ?? []).slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-primary-fixed/50 px-2 py-0.5 text-[11px] text-on-surface"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        {failed && (
          <p className="mt-2 text-xs text-rose-700">
            Ingest failed — delete and re-upload after fixing API/quota issues.
          </p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-outline-variant pt-4">
        {ready && !doc.archived ? (
          <Link
            href={`/chat/${doc.id}`}
            className="flex items-center gap-2 font-semibold text-primary transition-all hover:gap-3"
          >
            Ask Questions
            <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
        ) : (
          <span className="text-body-sm font-medium text-on-surface-variant">
            {doc.archived
              ? "Archived"
              : processing
                ? "Indexing…"
                : "Not ready"}
          </span>
        )}
      </div>
    </article>
  );
}
