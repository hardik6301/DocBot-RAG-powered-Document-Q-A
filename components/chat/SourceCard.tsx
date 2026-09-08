type SourceCardProps = {
  index: string;
  page: string;
  excerpt: string;
  filename?: string;
  active?: boolean;
  onOpen?: () => void;
};

export default function SourceCard({
  index,
  page,
  excerpt,
  filename,
  active,
  onOpen,
}: SourceCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-56 shrink-0 cursor-pointer rounded-xl border p-3.5 text-left shadow-sm transition-all ${
        active
          ? "border-primary bg-primary-fixed/40 ring-2 ring-primary/20"
          : "border-outline-variant bg-white hover:border-primary hover:-translate-y-0.5"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-on-primary">
          {index}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-on-surface">
            {filename || "Source"}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-wide text-outline">
            {page}
          </p>
        </div>
      </div>
      <p className="line-clamp-3 text-[12px] leading-snug text-on-surface-variant">
        “{excerpt}”
      </p>
      {onOpen && (
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
          Open in document →
        </p>
      )}
    </button>
  );
}
