"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import type { DocumentShareRow } from "@/types";

type Props = {
  documentId: string;
  documentName: string;
  open: boolean;
  onClose: () => void;
};

export default function ShareDocumentModal({
  documentId,
  documentName,
  open,
  onClose,
}: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [shares, setShares] = useState<DocumentShareRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/documents/${documentId}/share`, {
      credentials: "same-origin",
    });
    const data = (await res.json().catch(() => ({}))) as {
      shares?: DocumentShareRow[];
      error?: string;
    };
    if (!res.ok) {
      setError(data.error || "Failed to load shares");
      return;
    }
    setShares(data.shares ?? []);
  }, [documentId]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLastLink(null);
    void load();
  }, [open, load]);

  if (!open) return null;

  const invite = async () => {
    setBusy(true);
    setError(null);
    setLastLink(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/share`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        acceptUrl?: string;
      };
      if (!res.ok) throw new Error(data.error || "Invite failed");
      setLastLink(data.acceptUrl ?? null);
      setEmail("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (shareId: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", shareId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Revoke failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-outline-variant bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-on-surface">Share</h2>
            <p className="mt-0.5 truncate text-body-sm text-on-surface-variant">
              {documentName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-outline hover:text-primary"
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@email.com"
            className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-body-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value === "editor" ? "editor" : "viewer")
              }
              className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-body-sm"
            >
              <option value="viewer">Viewer (chat)</option>
              <option value="editor">Editor (chat + rename/tags)</option>
            </select>
            <button
              type="button"
              disabled={busy || !email.trim()}
              onClick={() => void invite()}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"
            >
              Invite
            </button>
          </div>
          {lastLink && (
            <p className="break-all rounded-lg bg-surface-container-low p-2 text-xs text-on-surface-variant">
              Accept link: {lastLink}
            </p>
          )}
          {error && (
            <p className="text-body-sm text-error">{error}</p>
          )}
        </div>

        <ul className="mt-5 max-h-48 space-y-2 overflow-y-auto">
          {shares.length === 0 ? (
            <li className="text-body-sm text-on-surface-variant">
              No shares yet.
            </li>
          ) : (
            shares.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-medium">{s.email}</p>
                  <p className="text-[11px] text-on-surface-variant">
                    {s.role} · {s.status}
                  </p>
                </div>
                {s.status !== "revoked" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void revoke(s.id)}
                    className="text-xs font-medium text-error hover:underline disabled:opacity-50"
                  >
                    Revoke
                  </button>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
