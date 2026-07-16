"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FileUpload from "@/components/upload/FileUpload";
import ProcessingStatus from "@/components/upload/ProcessingStatus";
import DocumentCard from "@/components/dashboard/DocumentCard";
import DeployBanner from "@/components/dashboard/DeployBanner";
import Icon from "@/components/ui/Icon";
import { useDocuments } from "@/hooks/useDocuments";

export default function DashboardPage() {
  const {
    documents,
    usage,
    isPro,
    loading,
    error,
    uploading,
    upload,
    remove,
    setPro,
  } = useDocuments();

  const limit = usage.limit;
  const atLimit = usage.limit != null && usage.used >= usage.limit;
  const pct = usage.limit
    ? Math.min(100, Math.round((usage.used / usage.limit) * 100))
    : 100;

  return (
    <div className="min-h-[100dvh] bg-surface">
      <Navbar variant="app" />

      <aside className="fixed left-0 top-16 z-40 hidden h-[calc(100dvh-64px)] w-64 flex-col border-r border-outline-variant bg-surface-container-lowest p-stack-lg lg:flex">
        <div className="mb-stack-lg">
          <h3 className="mb-4 font-mono text-label-caps text-on-surface-variant">
            WORKSPACE STATS
          </h3>
          <div className="rounded-xl border border-outline-variant bg-surface p-4">
            <div className="mb-2 flex items-end justify-between">
              <span className="text-body-sm font-medium">Storage Used</span>
              <span className="text-body-sm text-on-surface-variant">
                {isPro
                  ? `${usage.used} · Unlimited`
                  : `${usage.used}/${limit ?? 3} documents`}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-variant">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-4 text-xs text-on-secondary-container">
              {isPro
                ? "Pro active — unlimited uploads, multi-doc Q&A, analytics."
                : `Local mode — Free tier: ${limit ?? 3} documents.`}
            </p>
            {isPro ? (
              <button
                type="button"
                onClick={() => void setPro(false)}
                className="mt-4 block w-full rounded-lg border border-outline-variant py-2 text-center text-body-sm font-semibold text-on-surface transition-all hover:bg-surface-container-low active:scale-95"
              >
                Switch to Free (demo)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void setPro(true)}
                className="mt-4 block w-full rounded-lg bg-primary py-2 text-center text-body-sm font-semibold text-on-primary transition-all hover:opacity-90 active:scale-95"
              >
                Unlock Pro (demo)
              </button>
            )}
          </div>
        </div>
        <div className="mt-auto space-y-2">
          <Link
            href="/chat/multi"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            <Icon name="hub" className="text-[20px]" />
            <span className="font-mono text-label-caps">Multi-doc Q&A</span>
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
                Manage and analyze your technical documentation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isPro && (
                <span className="rounded-full bg-primary-container px-3 py-1.5 font-mono text-label-caps text-on-primary-container">
                  Pro · Priority ingest
                </span>
              )}
              <div className="rounded-full bg-surface-container-low px-4 py-2 font-mono text-label-caps text-on-surface-variant">
                {isPro ? `${usage.used} docs · Unlimited` : `${usage.used}/${limit ?? 3} used`}
              </div>
            </div>
          </header>

          <DeployBanner />

          {atLimit && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-body-sm text-amber-900">
              Free tier full ({limit}/{limit}). Delete a document or unlock Pro
              to upload more.
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
                  className="h-64 animate-pulse rounded-xl border border-outline-variant bg-surface-container-low"
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
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onDelete={(id) => {
                    if (confirm("Delete this document?")) void remove(id);
                  }}
                />
              ))}
              {!atLimit && (
                <div className="hidden h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low text-center xl:flex">
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
