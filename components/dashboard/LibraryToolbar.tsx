"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";

export type LibraryView = "grid" | "table";
export type LibrarySort =
  | "recent"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "updated";

export type LibraryFilters = {
  status: "all" | "ready" | "processing" | "failed";
  fileType: string; // "all" | pdf | ppt | ...
  folder: string; // "all" | "unfiled" | folder name
  tag: string; // "all" | tag
};

const SORT_LABELS: Record<LibrarySort, string> = {
  recent: "Recently Added",
  oldest: "Oldest First",
  "name-asc": "Name A–Z",
  "name-desc": "Name Z–A",
  updated: "Recently Updated",
};

type Props = {
  view: LibraryView;
  onViewChange: (v: LibraryView) => void;
  sort: LibrarySort;
  onSortChange: (s: LibrarySort) => void;
  filters: LibraryFilters;
  onFiltersChange: (f: LibraryFilters) => void;
  showingCount: number;
  showArchived: boolean;
  folders: string[];
  tags: string[];
  fileTypes: string[];
};

export default function LibraryToolbar({
  view,
  onViewChange,
  sort,
  onSortChange,
  filters,
  onFiltersChange,
  showingCount,
  showArchived,
  folders,
  tags,
  fileTypes,
}: Props) {
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (sortOpen && !sortRef.current?.contains(t)) setSortOpen(false);
      if (filterOpen && !filterRef.current?.contains(t)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [sortOpen, filterOpen]);

  const activeFilterCount = [
    filters.status !== "all",
    filters.fileType !== "all",
    filters.folder !== "all",
    filters.tag !== "all",
  ].filter(Boolean).length;

  const clearFilters = () =>
    onFiltersChange({
      status: "all",
      fileType: "all",
      folder: "all",
      tag: "all",
    });

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-outline-variant bg-white p-0.5">
          <button
            type="button"
            onClick={() => onViewChange("grid")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
              view === "grid"
                ? "bg-[#E8EEFF] text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Icon name="grid_view" className="text-[18px]" />
            Grid
          </button>
          <button
            type="button"
            onClick={() => onViewChange("table")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
              view === "table"
                ? "bg-[#E8EEFF] text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Icon name="table_rows" className="text-[18px]" />
            Table
          </button>
        </div>
        <p className="text-[13px] text-[#6B7280]">
          Showing {showingCount} {showArchived ? "archived" : "active"}{" "}
          document{showingCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative" ref={sortRef}>
          <button
            type="button"
            onClick={() => {
              setSortOpen((v) => !v);
              setFilterOpen(false);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-white px-3 py-2 text-[13px] font-medium text-on-surface"
          >
            Sort: {SORT_LABELS[sort]}
            <Icon name="expand_more" className="text-[18px] text-outline" />
          </button>
          {sortOpen && (
            <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-outline-variant bg-white py-1 shadow-lg">
              {(Object.keys(SORT_LABELS) as LibrarySort[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-surface-container-low"
                  onClick={() => {
                    onSortChange(key);
                    setSortOpen(false);
                  }}
                >
                  {sort === key ? (
                    <Icon name="check" className="text-[16px] text-primary" />
                  ) : (
                    <span className="w-4" />
                  )}
                  {SORT_LABELS[key]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={filterRef}>
          <button
            type="button"
            onClick={() => {
              setFilterOpen((v) => !v);
              setSortOpen(false);
            }}
            className={`inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-[13px] font-medium ${
              activeFilterCount > 0
                ? "border-primary text-primary"
                : "border-outline-variant text-on-surface"
            }`}
          >
            <Icon name="filter_list" className="text-[18px]" />
            Filter
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-on-primary">
                {activeFilterCount}
              </span>
            )}
          </button>
          {filterOpen && (
            <div className="absolute right-0 z-20 mt-1 w-72 space-y-3 rounded-xl border border-outline-variant bg-white p-3 shadow-lg">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-outline">
                Status
                <select
                  value={filters.status}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      status: e.target.value as LibraryFilters["status"],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-low px-2 py-2 text-[13px] font-normal text-on-surface"
                >
                  <option value="all">All</option>
                  <option value="ready">Ready</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                </select>
              </label>

              <label className="block text-[11px] font-bold uppercase tracking-wide text-outline">
                File type
                <select
                  value={filters.fileType}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, fileType: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-low px-2 py-2 text-[13px] font-normal text-on-surface"
                >
                  <option value="all">All</option>
                  {fileTypes.map((t) => (
                    <option key={t} value={t}>
                      .{t}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[11px] font-bold uppercase tracking-wide text-outline">
                Folder
                <select
                  value={filters.folder}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, folder: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-low px-2 py-2 text-[13px] font-normal text-on-surface"
                >
                  <option value="all">All</option>
                  <option value="unfiled">Unfiled</option>
                  {folders.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>

              {tags.length > 0 && (
                <label className="block text-[11px] font-bold uppercase tracking-wide text-outline">
                  Tag
                  <select
                    value={filters.tag}
                    onChange={(e) =>
                      onFiltersChange({ ...filters, tag: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-low px-2 py-2 text-[13px] font-normal text-on-surface"
                  >
                    <option value="all">All</option>
                    {tags.map((t) => (
                      <option key={t} value={t}>
                        #{t}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="w-full rounded-lg px-2 py-2 text-[13px] font-medium text-primary hover:bg-[#E8EEFF]"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
