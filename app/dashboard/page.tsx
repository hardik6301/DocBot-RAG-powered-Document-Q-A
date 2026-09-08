"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import FileUpload from "@/components/upload/FileUpload";
import UrlImport from "@/components/upload/UrlImport";
import ProcessingStatus from "@/components/upload/ProcessingStatus";
import DocumentCard from "@/components/dashboard/DocumentCard";
import DocumentTable from "@/components/dashboard/DocumentTable";
import LibraryToolbar, {
  type LibraryFilters,
  type LibrarySort,
  type LibraryView,
} from "@/components/dashboard/LibraryToolbar";
import Icon from "@/components/ui/Icon";
import { useDocuments } from "@/hooks/useDocuments";
import { documentMatchesQuery } from "@/lib/library-search";
import { useWorkspace } from "@/components/layout/WorkspaceContext";

const DEFAULT_FILTERS: LibraryFilters = {
  status: "all",
  fileType: "all",
  folder: "all",
  tag: "all",
};

function DashboardMain({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (v: string) => void;
}) {
  const searchParams = useSearchParams();
  const { selection } = useWorkspace();
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
  const [showArchived, setShowArchived] = useState(false);
  const [view, setView] = useState<LibraryView>("grid");
  const [sort, setSort] = useState<LibrarySort>("recent");
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_FILTERS);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setQuery(q);
  }, [searchParams, setQuery]);

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

  const fileTypes = useMemo(() => {
    const set = new Set<string>();
    for (const d of scopedDocs) {
      if (d.fileType) set.add(d.fileType);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [scopedDocs]);

  const filtered = useMemo(() => {
    const list = scopedDocs.filter((d) => {
      if (showArchived ? !d.archived : d.archived) return false;
      if (filters.status !== "all" && d.status !== filters.status) return false;
      if (filters.fileType !== "all" && d.fileType !== filters.fileType) {
        return false;
      }
      if (filters.folder === "unfiled" && d.folder) return false;
      if (
        filters.folder !== "all" &&
        filters.folder !== "unfiled" &&
        d.folder !== filters.folder
      ) {
        return false;
      }
      if (filters.tag !== "all" && !(d.tags ?? []).includes(filters.tag)) {
        return false;
      }
      return documentMatchesQuery(d, query);
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === "name-asc") {
        return a.filename.localeCompare(b.filename);
      }
      if (sort === "name-desc") {
        return b.filename.localeCompare(a.filename);
      }
      if (sort === "oldest") {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
      if (sort === "updated") {
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }
      // recent
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
    return sorted;
  }, [scopedDocs, query, showArchived, filters, sort]);

  const cardHandlers = {
    onDelete: (id: string) => {
      if (confirm("Delete this document?")) void remove(id);
    },
    onRename: async (id: string, filename: string) => {
      await patch(id, { filename });
    },
    onArchive: async (id: string, archived: boolean) => {
      await patch(id, { archived });
    },
    onMoveFolder: async (id: string, folder: string | null) => {
      await patch(id, { folder });
    },
    onSetTags: async (id: string, nextTags: string[]) => {
      await patch(id, { tags: nextTags });
    },
    onRetry: async (id: string) => {
      await retryIngest(id);
    },
  };

  return (
    <>
      <main className="px-4 pb-16 pt-8 md:px-8">
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
                  ? `${scopedDocs.filter((d) => !d.archived).length} documents`
                  : `${usage.used}/${usage.limit} used`}
              </div>
            </div>
          </header>

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

          {!loading && scopedDocs.length > 0 && (
            <LibraryToolbar
              view={view}
              onViewChange={setView}
              sort={sort}
              onSortChange={setSort}
              filters={filters}
              onFiltersChange={setFilters}
              showingCount={filtered.length}
              showArchived={showArchived}
              folders={folders}
              tags={tags}
              fileTypes={fileTypes}
            />
          )}

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
                Upload your first document to get started
              </h2>
              <p className="mt-2 text-body-md text-on-surface-variant">
                PDF, PPT, DOC, TXT, Markdown, EPUB, or a webpage URL — then ask
                with citations.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low px-6 py-12 text-center">
              <p className="text-body-md text-on-surface-variant">
                No documents match
                {query.trim() ? ` “${query.trim()}”` : " these filters"}.
              </p>
            </div>
          ) : view === "table" ? (
            <DocumentTable
              docs={filtered}
              onDelete={cardHandlers.onDelete}
              onArchive={(id, archived) => {
                void cardHandlers.onArchive(id, archived);
              }}
              onRetry={(id) => {
                void cardHandlers.onRetry(id);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  folders={folders}
                  onDelete={cardHandlers.onDelete}
                  onRename={cardHandlers.onRename}
                  onArchive={cardHandlers.onArchive}
                  onMoveFolder={cardHandlers.onMoveFolder}
                  onSetTags={cardHandlers.onSetTags}
                  onRetry={cardHandlers.onRetry}
                />
              ))}
              {!atLimit &&
                !query.trim() &&
                !showArchived &&
                filters.status === "all" &&
                filters.fileType === "all" &&
                filters.folder === "all" &&
                filters.tag === "all" && (
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
