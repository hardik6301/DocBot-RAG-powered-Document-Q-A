"use client";

import { useCallback, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";

type Props = {
  onUpload: (file: File) => Promise<unknown>;
  uploading?: boolean;
  disabled?: boolean;
};

export default function FileUpload({ onUpload, uploading, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.[0] || disabled || uploading || busyRef.current) return;
      busyRef.current = true;
      setLocalError(null);
      try {
        await onUpload(files[0]);
      } catch (e) {
        setLocalError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        busyRef.current = false;
      }
    },
    [onUpload, disabled, uploading],
  );

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handleFiles(e.dataTransfer.files);
      }}
      className={`flex min-h-[168px] flex-col items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white px-6 py-10 text-center transition-colors ${
        disabled
          ? "opacity-60"
          : dragging
            ? "border-primary bg-[#F3F6FF]"
            : "hover:border-[#C7CDD9]"
      }`}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8EEFF]">
        <Icon
          name={uploading ? "hourglass_top" : "cloud_upload"}
          className={`text-[24px] text-primary ${uploading ? "animate-pulse" : ""}`}
        />
      </div>

      {uploading ? (
        <p className="text-[15px] font-semibold text-on-surface">Uploading…</p>
      ) : (
        <p className="text-[15px] font-semibold text-on-surface">
          Drag and drop files here, or{" "}
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="text-primary underline underline-offset-2 transition-opacity hover:opacity-80 disabled:cursor-not-allowed"
          >
            browse files
          </button>
        </p>
      )}

      <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-[#6B7280]">
        Supports .pdf, .docx, .txt, .md, .pptx, .epub (Max 25MB). Auto-OCR for
        scanned documents.
      </p>

      {localError && (
        <p className="mt-3 text-body-sm text-error">{localError}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.md,.markdown,.epub,application/pdf,text/plain,text/markdown,application/epub+zip"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
