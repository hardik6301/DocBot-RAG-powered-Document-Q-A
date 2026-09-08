"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import Icon from "@/components/ui/Icon";
import type { AppDocument, WorkspaceRow } from "@/types";

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [docs, setDocs] = useState<AppDocument[]>([]);
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedWs, setSelectedWs] = useState<string>("");
  const [assignDocId, setAssignDocId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const [wsRes, docRes] = await Promise.all([
      fetch("/api/workspaces", { credentials: "same-origin" }),
      fetch("/api/documents", { credentials: "same-origin" }),
    ]);
    const wsData = (await wsRes.json().catch(() => ({}))) as {
      workspaces?: WorkspaceRow[];
      error?: string;
    };
    const docData = (await docRes.json().catch(() => ({}))) as {
      documents?: AppDocument[];
    };
    if (!wsRes.ok) {
      setError(wsData.error || "Failed to load workspaces");
      return;
    }
    const list = wsData.workspaces ?? [];
    setWorkspaces(list);
    setDocs((docData.documents ?? []).filter((d) => d.accessRole === "owner"));
    setSelectedWs((cur) => cur || list[0]?.id || "");
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Create failed");
      setName("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const invite = async () => {
    if (!selectedWs) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite",
          workspaceId: selectedWs,
          email: inviteEmail,
          role: "member",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Invite failed");
      setInviteEmail("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  };

  const assign = async () => {
    if (!assignDocId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign-doc",
          documentId: assignDocId,
          workspaceId: selectedWs || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Assign failed");
      setAssignDocId("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assign failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 md:px-8">
        <header className="mb-8">
          <h1 className="text-headline-xl text-on-surface">Workspaces</h1>
          <p className="mt-1 text-on-surface-variant">
            Team spaces share documents with members. Vectors stay in the
            owner&apos;s Pinecone namespace.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-error-container bg-error-container/40 px-4 py-3 text-body-sm text-on-error-container">
            {error}
          </div>
        )}

        <section className="mb-8 rounded-2xl border border-outline-variant bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
            Create workspace
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Engineering library"
              className="flex-1 rounded-lg border border-outline-variant px-3 py-2 text-body-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              disabled={busy || !name.trim()}
              onClick={() => void create()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </section>

        <section className="mb-8 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
            Your workspaces
          </h2>
          {workspaces.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">
              No workspaces yet.
            </p>
          ) : (
            workspaces.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWs(w.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                  selectedWs === w.id
                    ? "border-primary bg-primary-fixed/40"
                    : "border-outline-variant bg-white hover:bg-surface-container-low"
                }`}
              >
                <div>
                  <p className="font-medium text-on-surface">{w.name}</p>
                  <p className="text-[12px] text-on-surface-variant">
                    {w.role} · {w.memberCount} member
                    {w.memberCount === 1 ? "" : "s"}
                  </p>
                </div>
                <Icon name="group" className="text-outline" />
              </button>
            ))
          )}
        </section>

        {selectedWs && (
          <>
            <section className="mb-8 rounded-2xl border border-outline-variant bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
                Invite member (must already have a DocBot account)
              </h2>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@email.com"
                  className="flex-1 rounded-lg border border-outline-variant px-3 py-2 text-body-sm outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  disabled={busy || !inviteEmail.trim()}
                  onClick={() => void invite()}
                  className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface disabled:opacity-50"
                >
                  Invite
                </button>
              </div>
            </section>

            <section className="mb-8 rounded-2xl border border-outline-variant bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
                Assign your document to this workspace
              </h2>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={assignDocId}
                  onChange={(e) => setAssignDocId(e.target.value)}
                  className="flex-1 rounded-lg border border-outline-variant px-3 py-2 text-body-sm"
                >
                  <option value="">Select a document…</option>
                  {docs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.filename}
                      {d.workspaceId === selectedWs ? " (already here)" : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy || !assignDocId}
                  onClick={() => void assign()}
                  className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface disabled:opacity-50"
                >
                  Assign
                </button>
              </div>
            </section>
          </>
        )}

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-body-sm font-medium text-primary"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          Back to dashboard
        </Link>
      </main>
      <Footer />
    </AppShell>
  );
}
