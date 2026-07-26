"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppDocument } from "@/types";

type Usage = { used: number; limit: number | null };

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
    remove,
    setPro,
  };
}
