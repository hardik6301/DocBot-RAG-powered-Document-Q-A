"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppDocument } from "@/types";

type Usage = { used: number; limit: number | null };

export type DocumentPatch = {
  filename?: string;
  folder?: string | null;
  tags?: string[] | null;
  archived?: boolean;
};

function kickIngest(jobId: string | undefined) {
  if (!jobId) return;
  // Separate serverless invocation as backup to waitUntil.
  void fetch("/api/ingest/run", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId }),
  }).catch(() => {
    /* background */
  });
}

export function useDocuments() {
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [usage, setUsage] = useState<Usage>({ used: 0, limit: null });
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadLock = useRef(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/documents", { credentials: "same-origin" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load documents");
      setDocuments(data.documents ?? []);
      setUsage(data.usage ?? { used: 0, limit: null });
      setIsPro(Boolean(data.isPro));
    } catch (e) {
      // Keep existing cards if a later fetch flakes (common after chat nav).
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Poll while any document is processing (async ingest).
  useEffect(() => {
    const processing = documents.some((d) => d.status === "processing");
    if (!processing) return;
    const id = window.setInterval(() => {
      void refresh();
    }, 2500);
    return () => window.clearInterval(id);
  }, [documents, refresh]);

  const upload = useCallback(
    async (file: File) => {
      if (uploadLock.current) return undefined as unknown as AppDocument;
      uploadLock.current = true;
      setUploading(true);
      setError(null);
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        const uploaded = data.document as AppDocument | undefined;
        kickIngest(data.jobId as string | undefined);
        if (uploaded) {
          setDocuments((prev) => [
            uploaded,
            ...prev.filter((d) => d.id !== uploaded.id),
          ]);
        }
        await refresh();
        return uploaded as AppDocument;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setError(msg);
        throw e;
      } finally {
        uploadLock.current = false;
        setUploading(false);
      }
    },
    [refresh],
  );

  const ingestUrl = useCallback(
    async (url: string) => {
      if (uploadLock.current) return undefined as unknown as AppDocument;
      uploadLock.current = true;
      setUploading(true);
      setError(null);
      try {
        const res = await fetch("/api/ingest/url", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "URL ingest failed");
        const uploaded = data.document as AppDocument | undefined;
        kickIngest(data.jobId as string | undefined);
        if (uploaded) {
          setDocuments((prev) => [
            uploaded,
            ...prev.filter((d) => d.id !== uploaded.id),
          ]);
        }
        await refresh();
        return uploaded as AppDocument;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "URL ingest failed";
        setError(msg);
        throw e;
      } finally {
        uploadLock.current = false;
        setUploading(false);
      }
    },
    [refresh],
  );

  const retryIngest = useCallback(
    async (documentId: string) => {
      setError(null);
      const res = await fetch("/api/ingest/retry", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Retry failed");
        throw new Error(data.error || "Retry failed");
      }
      kickIngest(data.jobId as string | undefined);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === documentId ? { ...d, status: "processing" } : d,
        ),
      );
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      setError(null);
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Delete failed");
        throw new Error(data.error || "Delete failed");
      }
      await refresh();
    },
    [refresh],
  );

  const patch = useCallback(
    async (id: string, body: DocumentPatch) => {
      setError(null);
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Update failed");
        throw new Error(data.error || "Update failed");
      }
      const updated = data.document as AppDocument;
      setDocuments((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d)),
      );
      return updated;
    },
    [],
  );

  const setPro = useCallback(
    async (enabled: boolean) => {
      setError(null);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPro: enabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update plan");
        throw new Error(data.error || "Failed to update plan");
      }
      await refresh();
    },
    [refresh],
  );

  return {
    documents,
    usage,
    isPro,
    loading,
    error,
    uploading,
    refresh,
    upload,
    ingestUrl,
    retryIngest,
    remove,
    patch,
    setPro,
  };
}
