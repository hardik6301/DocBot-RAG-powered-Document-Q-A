"use client";

type Props = {
  status?: "processing" | "ready" | "failed" | "uploading";
  message?: string;
};

export default function ProcessingStatus({ status, message }: Props) {
  if (!status) return null;

  const styles =
    status === "ready"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : status === "failed"
        ? "border-rose-200 bg-rose-50 text-rose-900"
        : "border-amber-200 bg-amber-50 text-amber-900";

  const label =
    status === "uploading"
      ? "Uploading & indexing…"
      : status === "processing"
        ? "Chunking & embedding…"
        : status === "ready"
          ? "Ready"
          : "Failed";

  return (
    <div className={`rounded-xl border px-4 py-3 text-body-sm ${styles}`}>
      <span className="font-semibold">{label}</span>
      {message ? <span className="ml-2 opacity-80">{message}</span> : null}
    </div>
  );
}
