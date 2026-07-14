"use client";

import { useCallback, useState } from "react";
import Icon from "@/components/ui/Icon";

type Props = {
  onUpload: (file: File) => Promise<unknown>;
  uploading?: boolean;
  disabled?: boolean;
};

export default function FileUpload({ onUpload, uploading, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.[0] || disabled) return;
      setLocalError(null);
      try {
        await onUpload(files[0]);
      } catch (e) {
        setLocalError(e instanceof Error ? e.message : "Upload failed");
      }
    },
    [onUpload, disabled],
  );

  return (
    <label
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
      className={`upload-dashed group flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-xl p-stack-lg text-center transition-all ${
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
      <h2 className="mb-2 text-headline-lg text-on-surface">
        {uploading ? "Uploading…" : "Upload Document"}
      </h2>
      <p className="max-w-md text-on-surface-variant">
        Drag and drop your PDF or PPT files here, or click to browse. Supported
        formats: .pdf, .pptx, .docx (Max 25MB)
      </p>
      {localError && (
        <p className="mt-3 text-body-sm text-error">{localError}</p>
      )}
      <input
        type="file"
        accept=".pdf,.ppt,.pptx,.doc,.docx,application/pdf"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}
