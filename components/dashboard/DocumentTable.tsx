"use client";

import Link from "next/link";
import Icon from "@/components/ui/Icon";
import type { AppDocument } from "@/types";

type Props = {
  docs: AppDocument[];
  onDelete?: (id: string) => void;
  onArchive?: (id: string, archived: boolean) => void;
  onRetry?: (id: string) => void;
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

function statusClass(status: string, archived: boolean) {
  if (archived) return "bg-surface-container text-on-surface-variant";
  if (status === "ready") return "bg-emerald-100 text-emerald-800";
  if (status === "processing") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

export default function DocumentTable({
  docs,
  onDelete,
  onArchive,
  onRetry,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant bg-white">
      <table className="min-w-full text-left text-[13px]">
        <thead className="border-b border-outline-variant bg-surface-container-low text-[11px] font-bold uppercase tracking-wide text-outline">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Pages</th>
            <th className="px-4 py-3">Added</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {docs.map((doc) => (
            <tr key={doc.id} className="hover:bg-surface-container-low/60">
              <td className="max-w-[240px] px-4 py-3">
                <div className="truncate font-medium text-on-surface" title={doc.filename}>
                  {doc.filename}
                </div>
                {doc.folder && (
                  <div className="mt-0.5 truncate text-[11px] text-on-surface-variant">
                    {doc.folder}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 uppercase text-on-surface-variant">
                {doc.fileType}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusClass(
                    doc.status,
                    doc.archived,
                  )}`}
                >
                  {doc.archived ? "archived" : doc.status}
                </span>
              </td>
              <td className="px-4 py-3 text-on-surface-variant">
                {doc.pageCount ?? "—"}
              </td>
              <td className="px-4 py-3 text-on-surface-variant">
                {formatDate(doc.createdAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  {doc.status === "ready" && !doc.archived && (
                    <Link
                      href={`/chat/${doc.id}`}
                      className="rounded-lg px-2 py-1.5 font-semibold text-primary hover:bg-[#E8EEFF]"
                    >
                      Ask
                    </Link>
                  )}
                  {doc.status === "failed" && (
                    <button
                      type="button"
                      onClick={() => onRetry?.(doc.id)}
                      className="rounded-lg px-2 py-1.5 text-primary hover:bg-[#E8EEFF]"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onArchive?.(doc.id, !doc.archived)}
                    className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container"
                    aria-label={doc.archived ? "Unarchive" : "Archive"}
                  >
                    <Icon
                      name={doc.archived ? "unarchive" : "archive"}
                      className="text-[18px]"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Delete this document?")) onDelete?.(doc.id);
                    }}
                    className="rounded-lg p-1.5 text-error hover:bg-error/5"
                    aria-label="Delete"
                  >
                    <Icon name="delete" className="text-[18px]" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
