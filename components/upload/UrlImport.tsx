"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";

type Props = {
  onIngest: (url: string) => Promise<unknown>;
  busy?: boolean;
  disabled?: boolean;
};

export default function UrlImport({ onIngest, busy, disabled }: Props) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [localBusy, setLocalBusy] = useState(false);

  const submit = async () => {
    if (disabled || busy || localBusy) return;
    const value = url.trim();
    if (!value) return;
    setLocalBusy(true);
    setError(null);
    try {
      await onIngest(value);
      setUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "URL ingest failed");
    } finally {
      setLocalBusy(false);
    }
  };

  const waiting = busy || localBusy;

  return (
    <div className="rounded-xl border border-outline-variant bg-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon name="link" className="text-[20px] text-primary" />
        <h3 className="text-body-md font-semibold text-on-surface">
          Import from URL
        </h3>
      </div>
      <p className="mb-3 text-body-sm text-on-surface-variant">
        Fetch a public webpage and index it like any other document.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          disabled={disabled || waiting}
          placeholder="https://example.com/article"
          className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 text-body-sm outline-none focus:border-primary disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={disabled || waiting || !url.trim()}
          className="rounded-lg bg-primary px-4 py-2.5 text-body-sm font-semibold text-on-primary transition-opacity disabled:opacity-50"
        >
          {waiting ? "Importing…" : "Import"}
        </button>
      </div>
      {error && <p className="mt-2 text-body-sm text-error">{error}</p>}
    </div>
  );
}
