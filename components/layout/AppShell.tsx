"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import Navbar from "@/components/layout/Navbar";
import {
  WorkspaceProvider,
  useWorkspace,
} from "@/components/layout/WorkspaceContext";

type Props = {
  children: React.ReactNode;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Full-bleed chat layouts: no footer padding */
  flush?: boolean;
};

function ShellInner({
  children,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  flush,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [docCount, setDocCount] = useState<number | undefined>();
  const [sideSearch, setSideSearch] = useState("");
  const { selection } = useWorkspace();

  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch("/api/documents", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        documents?: Array<{ workspaceId?: string | null; archived?: boolean }>;
      };
      const docs = data.documents ?? [];
      const count = docs.filter((d) => {
        if (d.archived) return false;
        if (selection.kind === "personal") return !d.workspaceId;
        return d.workspaceId === selection.id;
      }).length;
      setDocCount(count);
    } catch {
      setDocCount(undefined);
    }
  }, [selection]);

  useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const el = document.getElementById(
          "app-top-search",
        ) as HTMLInputElement | null;
        el?.focus();
        el?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-surface">
      <Suspense fallback={null}>
        <AppSidebar
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          documentCount={docCount}
          sidebarSearch={sideSearch}
          onSidebarSearchChange={setSideSearch}
        />
      </Suspense>
      <div className="lg:pl-[260px]">
        <Navbar
          variant="app"
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          onMenuClick={() => setMobileOpen(true)}
        />
        <div className={flush ? "" : "pb-12"}>{children}</div>
      </div>
    </div>
  );
}

export default function AppShell(props: Props) {
  return (
    <WorkspaceProvider>
      <ShellInner {...props} />
    </WorkspaceProvider>
  );
}
