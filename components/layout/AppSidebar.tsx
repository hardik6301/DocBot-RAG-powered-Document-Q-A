"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { useWorkspace } from "@/components/layout/WorkspaceContext";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  documentCount?: number;
  sidebarSearch?: string;
  onSidebarSearchChange?: (v: string) => void;
};

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
        active
          ? "bg-[#E8EEFF] text-primary"
          : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
      }`}
    >
      <Icon name={item.icon} className="text-[20px]" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-semibold text-on-surface-variant shadow-sm">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-outline">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export default function AppSidebar({
  open,
  onClose,
  documentCount,
  sidebarSearch = "",
  onSidebarSearchChange,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    label,
    selection,
    workspaces,
    setPersonal,
    selectWorkspace,
  } = useWorkspace();
  const [wsOpen, setWsOpen] = useState(false);
  const wsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!wsRef.current?.contains(e.target as Node)) setWsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [wsOpen]);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return (
        pathname === "/dashboard" ||
        (pathname.startsWith("/chat/") &&
          !pathname.startsWith("/chat/multi") &&
          !pathname.startsWith("/chat/compare"))
      );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navigate = () => onClose();

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          aria-label="Close menu"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-outline-variant bg-white transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5 px-4 pb-2 pt-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary">
            <Icon name="description" className="text-[18px]" filled />
          </span>
          <Link
            href="/dashboard"
            onClick={navigate}
            className="text-[17px] font-bold tracking-tight text-on-surface"
          >
            DocBot
          </Link>
        </div>

        <div className="relative px-3 pt-2" ref={wsRef}>
          <button
            type="button"
            onClick={() => setWsOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-full border border-[#D6E0FF] bg-[#F3F6FF] px-3 py-2 text-left text-[13px] font-medium text-on-surface transition-colors hover:bg-[#E8EEFF]"
            aria-expanded={wsOpen}
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <Icon name="unfold_more" className="text-[18px] text-outline" />
          </button>
          {wsOpen && (
            <div className="absolute left-3 right-3 z-20 mt-1.5 overflow-hidden rounded-xl border border-outline-variant bg-white py-1 shadow-lg">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-surface-container-low"
                onClick={() => {
                  setPersonal();
                  setWsOpen(false);
                }}
              >
                {selection.kind === "personal" ? (
                  <Icon name="check" className="text-[16px] text-primary" />
                ) : (
                  <span className="w-4" />
                )}
                Personal
              </button>
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-surface-container-low"
                  onClick={() => {
                    selectWorkspace(w);
                    setWsOpen(false);
                  }}
                >
                  {selection.kind === "workspace" && selection.id === w.id ? (
                    <Icon name="check" className="text-[16px] text-primary" />
                  ) : (
                    <span className="w-4" />
                  )}
                  <span className="truncate">{w.name}</span>
                </button>
              ))}
              <div className="my-1 border-t border-outline-variant" />
              <Link
                href="/workspaces"
                onClick={() => {
                  setWsOpen(false);
                  navigate();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] font-medium text-primary hover:bg-surface-container-low"
              >
                Manage workspaces
              </Link>
            </div>
          )}
        </div>

        <div className="space-y-2 px-3 pt-3">
          <button
            type="button"
            onClick={() => {
              router.push("/dashboard");
              navigate();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-[13px] font-semibold text-on-primary shadow-sm transition-opacity hover:opacity-95"
          >
            <Icon name="add" className="text-[18px]" />
            New Chat
          </button>
          <div className="relative">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline"
            />
            <input
              type="search"
              value={sidebarSearch}
              onChange={(e) => onSidebarSearchChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  router.push(
                    `/dashboard?q=${encodeURIComponent(sidebarSearch.trim())}`,
                  );
                  navigate();
                }
              }}
              placeholder="Search"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-2 pl-9 pr-12 text-[13px] outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-outline-variant bg-white px-1.5 py-0.5 text-[10px] font-medium text-outline sm:inline">
              ⌘K
            </kbd>
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          <div className="mx-1 mb-3 border-t border-outline-variant" />
          <Section title="Work">
            <NavLink
              item={{
                href: "/dashboard",
                label: "Documents",
                icon: "description",
                badge: documentCount,
              }}
              active={isActive("/dashboard")}
              onNavigate={navigate}
            />
            <NavLink
              item={{
                href: "/history",
                label: "Chat History",
                icon: "history",
              }}
              active={isActive("/history")}
              onNavigate={navigate}
            />
          </Section>
          <Section title="Ask">
            <NavLink
              item={{
                href: "/chat/multi",
                label: "Multi-doc Q&A",
                icon: "grid_view",
              }}
              active={isActive("/chat/multi")}
              onNavigate={navigate}
            />
            <NavLink
              item={{
                href: "/chat/compare",
                label: "Compare",
                icon: "compare_arrows",
              }}
              active={isActive("/chat/compare")}
              onNavigate={navigate}
            />
          </Section>
          <Section title="Organize">
            <NavLink
              item={{
                href: "/dashboard?organize=1",
                label: "Folders & Tags",
                icon: "folder",
              }}
              active={
                pathname === "/dashboard" &&
                searchParams.get("organize") === "1"
              }
              onNavigate={navigate}
            />
          </Section>
          <Section title="Insights">
            <NavLink
              item={{
                href: "/analytics",
                label: "Analytics",
                icon: "insights",
              }}
              active={isActive("/analytics")}
              onNavigate={navigate}
            />
          </Section>
        </div>

        <div className="border-t border-outline-variant px-2 py-3">
          <NavLink
            item={{ href: "/settings", label: "Settings", icon: "settings" }}
            active={isActive("/settings")}
            onNavigate={navigate}
          />
        </div>
      </aside>
    </>
  );
}
