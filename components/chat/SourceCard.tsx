type SourceCardProps = {
  index: string;
  page: string;
  excerpt: string;
};

export default function SourceCard({ index, page, excerpt }: SourceCardProps) {
  return (
    <button
      type="button"
      className="w-48 shrink-0 cursor-pointer rounded-lg border border-outline-variant bg-white p-3 text-left shadow-sm transition-colors hover:border-primary"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-primary-fixed text-[10px] font-bold text-primary">
          {index}
        </span>
        <span className="font-mono text-[10px] uppercase text-outline">
          {page}
        </span>
      </div>
      <p className="line-clamp-3 text-[11px] italic text-on-surface-variant">
        {excerpt}
      </p>
    </button>
  );
}
