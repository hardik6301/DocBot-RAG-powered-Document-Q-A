"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import FileUpload from "@/components/upload/FileUpload";
import UrlImport from "@/components/upload/UrlImport";
import ProcessingStatus from "@/components/upload/ProcessingStatus";
import DocumentCard from "@/components/dashboard/DocumentCard";
import Icon from "@/components/ui/Icon";
import { useDocuments } from "@/hooks/useDocuments";
import { documentMatchesQuery } from "@/lib/library-search";
import { useWorkspace } from "@/components/layout/WorkspaceContext";

function DashboardMain({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (v: string) => void;
}) {
  const searchParams = useSearchParams();
  const { selection, label } = useWorkspace();
  const {
    documents,
    usage,
    loading,
    error,
    uploading,
    upload,
    ingestUrl,
    retryIngest,
    remove,
    patch,
  } = useDocuments();
  const [folderFilter, setFolderFilter] = useState<string | "all" | "unfiled">(
    "all",
  );
  const [tagFilter, setTagFilter] = useState<string | "all">("all");
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setQuery(q);
  }, [searchParams, setQuery]);

  useEffect(() => {
    if (searchParams.get("organize") === "1") {
      document
        .getElementById("organize")
        ?.scrollIntoView({ behavior: "smooth" });
    }
  }, [searchParams]);

  const unlimited = usage.limit == null;
  const atLimit = usage.limit != null && usage.used >= usage.limit;

  const scopedDocs = useMemo(() => {
    return documents.filter((d) => {
      if (selection.kind === "personal") return !d.workspaceId;
      return d.workspaceId === selection.id;
    });
  }, [documents, selection]);

  const folders = useMemo(() => {
    const set = new Set<string>();
    for (const d of scopedDocs) {
      if (d.folder?.trim()) set.add(d.folder.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [scopedDocs]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const d of scopedDocs) {
      for (const t of d.tags ?? []) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [scopedDocs]);

  const filtered = useMemo(() => {
    return scopedDocs.filter((d) => {
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
  }, [scopedDocs, query, folderFilter, tagFilter, showArchived]);

  return (
    <>
      <main className="px-4 pb-16 pt-8 md:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-headline-xl text-on-surface">Documents</h1>
              <p className="mt-1 text-on-surface-variant">
                {label} — organize, search, and open chats.
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
                  ? `${scopedDocs.filter((d) => !d.archived).length} documents`
                  : `${usage.used}/${usage.limit} used`}
              </div>
            </div>
          </header>

          <section
            id="organize"
            className="mb-6 rounded-2xl border border-outline-variant bg-white p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <Icon name="folder" className="text-[18px] text-primary" />
              <h2 className="text-sm font-semibold text-on-surface">
                Folders &amp; tags
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFolderFilter("all")}
                className={`rounded-full px-3 py-1.5 text-[12px] ${
                  folderFilter === "all"
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                All folders
              </button>
              <button
                type="button"
                onClick={() => setFolderFilter("unfiled")}
                className={`rounded-full px-3 py-1.5 text-[12px] ${
                  folderFilter === "unfiled"
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                Unfiled
              </button>
              {folders.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() =>
                    setFolderFilter((cur) => (cur === f ? "all" : f))
                  }
                  className={`rounded-full px-3 py-1.5 text-[12px] ${
                    folderFilter === f
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-outline-variant pt-3">
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
          </section>

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

          <section className="mb-8 space-y-3">
            {uploading && (
              <ProcessingStatus
                status="uploading"
                message="File saved — indexing continues in the background."
              />
            )}
            {scopedDocs.some((d) => d.status === "processing") &&
              !uploading && (
                <ProcessingStatus
                  status="processing"
                  message="Chunking, embedding, and indexing… this page refreshes automatically."
                />
              )}
            <FileUpload
              onUpload={upload}
              uploading={uploading}
              disabled={atLimit}
            />
            <UrlImport
              onIngest={ingestUrl}
              busy={uploading}
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
          ) : scopedDocs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low px-6 py-16 text-center">
              <Icon
                name="folder_open"
                className="mb-3 text-[40px] text-outline-variant"
              />
              <h2 className="text-headline-lg text-on-surface">
                No documents in {label}
              </h2>
              <p className="mt-2 text-body-md text-on-surface-variant">
                Upload a PDF, PPT, DOC, TXT, Markdown, EPUB, or webpage URL.
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
                  onSetTags={async (id, nextTags) => {
                    await patch(id, { tags: nextTags });
                  }}
                  onRetry={async (id) => {
                    await retryIngest(id);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function DashboardContent() {
  const [query, setQuery] = useState("");
  return (
    <AppShell
      searchQuery={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search documents, chats, folders…"
    >
      <DashboardMain query={query} setQuery={setQuery} />
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center text-on-surface-variant">
          Loading…
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
