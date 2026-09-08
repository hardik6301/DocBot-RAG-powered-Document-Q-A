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
      onClick={() => {
        if (!disabled && !uploading) inputRef.current?.click();
      }}
      className={`upload-dashed group flex min-h-[240px] w-full cursor-pointer flex-col items-center justify-center rounded-xl p-stack-lg text-center transition-all ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : dragging
            ? "bg-primary-fixed"
            : "hover:bg-surface-container-low"
      }`}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed transition-transform group-hover:scale-110">
        <Icon
          name={uploading ? "hourglass_top" : "upload_file"}
          className={`text-[32px] text-primary ${uploading ? "animate-pulse" : ""}`}
        />
      </div>
      {uploading ? (
        <h2 className="mb-2 text-headline-lg font-bold text-on-surface">
          Uploading…
        </h2>
      ) : (
        <p className="mb-2 text-headline-lg font-bold text-on-surface">
          Drag and drop files here, or{" "}
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            className="text-primary underline underline-offset-2 transition-opacity hover:opacity-80 disabled:cursor-not-allowed"
          >
            browse files
          </button>
        </p>
      )}
      <p className="max-w-md text-on-surface-variant">
        Supported: .pdf, .pptx, .docx, .txt, .md, .epub (Max 25MB). Scanned PDFs
        use OCR automatically.
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
