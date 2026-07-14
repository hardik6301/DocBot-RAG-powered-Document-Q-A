"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppDocument } from "@/types";

type Usage = { used: number; limit: number | null };

export function useDocuments() {
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [usage, setUsage] = useState<Usage>({ used: 0, limit: 3 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load documents");
      setDocuments(data.documents ?? []);
      setUsage(data.usage ?? { used: 0, limit: 3 });
    } catch (e) {
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
      setUploading(true);
      setError(null);
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        await refresh();
        return data.document as AppDocument;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setError(msg);
        throw e;
      } finally {
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

  return {
    documents,
    usage,
    loading,
    error,
    uploading,
    refresh,
    upload,
    remove,
  };
}
