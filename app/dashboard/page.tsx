"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FileUpload from "@/components/upload/FileUpload";
import ProcessingStatus from "@/components/upload/ProcessingStatus";
import DocumentCard from "@/components/dashboard/DocumentCard";
import DeployBanner from "@/components/dashboard/DeployBanner";
import Icon from "@/components/ui/Icon";
import { useDocuments } from "@/hooks/useDocuments";
import { documentMatchesQuery } from "@/lib/library-search";

export default function DashboardPage() {
  const {
    documents,
    usage,
    loading,
    error,
    uploading,
    upload,
    remove,
    patch,
  } = useDocuments();
  const [query, setQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState<string | "all" | "unfiled">(
    "all",
  );
  const [tagFilter, setTagFilter] = useState<string | "all">("all");
  const [showArchived, setShowArchived] = useState(false);

  const unlimited = usage.limit == null;
  const atLimit = usage.limit != null && usage.used >= usage.limit;
  const pct = unlimited
    ? Math.min(100, usage.used === 0 ? 0 : 12 + Math.min(usage.used * 4, 40))
    : Math.min(100, Math.round((usage.used / (usage.limit ?? 1)) * 100));

  const folders = useMemo(() => {
    const set = new Set<string>();
    for (const d of documents) {
      if (d.folder?.trim()) set.add(d.folder.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [documents]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const d of documents) {
      for (const t of d.tags ?? []) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [documents]);

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      if (showArchived ? !d.archived : d.archived) return false;
      if (folderFilter === "unfiled" && d.folder) return false;
      if (
        folderFilter !== "all" &&
        folderFilter !== "unfiled" &&
        d.folder !== folderFilter
      ) {
        return false;
      }
      if (tagFilter !== "all" && !(d.tags ?? []).includes(tagFilter)) {
        return false;
      }
      return documentMatchesQuery(d, query);
    });
  }, [documents, query, folderFilter, tagFilter, showArchived]);

  return (
    <div className="min-h-[100dvh] bg-surface">
      <Navbar
        variant="app"
        searchQuery={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search filename, folder, tags, summary…"
      />

      <aside className="fixed left-0 top-16 z-40 hidden h-[calc(100dvh-64px)] w-64 flex-col border-r border-outline-variant bg-surface-container-lowest p-stack-lg lg:flex">
        <div className="mb-stack-lg">
          <h3 className="mb-4 font-mono text-label-caps text-on-surface-variant">
            WORKSPACE STATS
          </h3>
          <div className="rounded-xl border border-outline-variant bg-surface p-4">
            <div className="mb-2 flex items-end justify-between gap-2">
              <span className="text-body-sm font-medium">Documents</span>
              <span className="shrink-0 text-body-sm text-on-surface-variant">
                {unlimited ? usage.used : `${usage.used}/${usage.limit}`}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-variant">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-on-secondary-container">
              {unlimited
                ? "Free & unlimited for now. Multi-doc Q&A and analytics included."
                : `Free tier: ${usage.limit} documents.`}
            </p>
          </div>
        </div>

        <div className="mb-stack-md space-y-2">
          <h3 className="font-mono text-label-caps text-on-surface-variant">
            Folders
          </h3>
          <button
            type="button"
            onClick={() => setFolderFilter("all")}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-body-sm transition-colors ${
              folderFilter === "all"
                ? "bg-primary-fixed text-on-surface"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            <Icon name="folder_open" className="text-[18px]" />
            All
          </button>
          <button
            type="button"
            onClick={() => setFolderFilter("unfiled")}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-body-sm transition-colors ${
              folderFilter === "unfiled"
                ? "bg-primary-fixed text-on-surface"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            <Icon name="topic" className="text-[18px]" />
            Unfiled
          </button>
          {folders.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFolderFilter(f)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-body-sm transition-colors ${
                folderFilter === f
                  ? "bg-primary-fixed text-on-surface"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <Icon name="folder" className="text-[18px]" />
              <span className="truncate">{f}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto space-y-2">
          <Link
            href="/history"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            <Icon name="history" className="text-[20px]" />
            <span className="font-mono text-label-caps">Chat history</span>
          </Link>
          <Link
            href="/chat/multi"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            <Icon name="hub" className="text-[20px]" />
            <span className="font-mono text-label-caps">Multi-doc Q&A</span>
          </Link>
          <Link
            href="/chat/compare"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            <Icon name="compare" className="text-[20px]" />
            <span className="font-mono text-label-caps">Compare</span>
          </Link>
          <Link
            href="/analytics"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            <Icon name="insights" className="text-[20px]" />
            <span className="font-mono text-label-caps">Analytics</span>
          </Link>
        </div>
      </aside>

      <main className="min-h-[100dvh] px-4 pb-24 pt-24 md:px-container-padding lg:ml-64">
        <div className="mx-auto max-w-6xl">
          <header className="mb-stack-lg flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-headline-xl text-on-surface">My Documents</h1>
              <p className="mt-1 text-on-surface-variant">
                Organize, search, and open chats across your library.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className={`rounded-full border px-4 py-2 font-mono text-label-caps transition-colors ${
                  showArchived
                    ? "border-primary bg-primary-fixed text-on-surface"
                    : "border-outline-variant bg-surface-container-low text-on-surface-variant"
                }`}
              >
                {showArchived ? "Viewing archived" : "Show archived"}
              </button>
              <div className="rounded-full bg-surface-container-low px-4 py-2 font-mono text-label-caps text-on-surface-variant">
                {unlimited
                  ? `${usage.used} documents`
                  : `${usage.used}/${usage.limit} used`}
              </div>
            </div>
          </header>

          <DeployBanner />

          {tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTagFilter("all")}
                className={`rounded-full px-3 py-1 text-[12px] ${
                  tagFilter === "all"
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                All tags
              </button>
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setTagFilter((cur) => (cur === t ? "all" : t))
                  }
                  className={`rounded-full px-3 py-1 text-[12px] ${
                    tagFilter === t
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}

          {atLimit && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-body-sm text-amber-900">
              Upload limit reached ({usage.limit}/{usage.limit}). Delete a
              document to upload another.
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-error-container bg-error-container/40 px-4 py-3 text-body-sm text-on-error-container">
              {error}
            </div>
          )}

          <section className="mb-stack-lg space-y-3">
            {uploading && (
              <ProcessingStatus
                status="uploading"
                message="Extracting text, embedding chunks, and indexing in Pinecone."
              />
            )}
            <FileUpload
              onUpload={upload}
              uploading={uploading}
              disabled={atLimit}
            />
          </section>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-xl border border-outline-variant bg-surface-container-low"
                />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low px-6 py-16 text-center">
              <Icon
                name="folder_open"
                className="mb-3 text-[40px] text-outline-variant"
              />
              <h2 className="text-headline-lg text-on-surface">
                Upload your first document to get started
              </h2>
              <p className="mt-2 text-body-md text-on-surface-variant">
                PDF or PPT — then ask questions with source citations.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low px-6 py-12 text-center">
              <p className="text-body-md text-on-surface-variant">
                No documents match
                {query.trim() ? ` “${query.trim()}”` : " these filters"}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  folders={folders}
                  onDelete={(id) => {
                    if (confirm("Delete this document?")) void remove(id);
                  }}
                  onRename={async (id, filename) => {
                    await patch(id, { filename });
                  }}
                  onArchive={async (id, archived) => {
                    await patch(id, { archived });
                  }}
                  onMoveFolder={async (id, folder) => {
                    await patch(id, { folder });
                  }}
                  onSetTags={async (id, tags) => {
                    await patch(id, { tags });
                  }}
                />
              ))}
              {!atLimit && !query.trim() && !showArchived && (
                <div className="hidden h-72 flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low text-center xl:flex">
                  <Icon
                    name="add_circle"
                    className="mb-2 text-[48px] text-outline-variant"
                  />
                  <p className="font-mono text-label-caps text-outline">
                    NEW DOCUMENT
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <div className="lg:ml-64">
        <Footer />
      </div>
    </div>
  );
}
