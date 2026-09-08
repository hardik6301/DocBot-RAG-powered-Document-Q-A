"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Icon from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";

type NavbarProps = {
  variant?: "marketing" | "app";
  /** Controlled search for dashboard (optional). */
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
};

const appLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/history", label: "History" },
  { href: "/workspaces", label: "Workspaces" },
  { href: "/chat/multi", label: "Multi-doc" },
  { href: "/chat/compare", label: "Compare" },
  { href: "/analytics", label: "Analytics" },
];

const marketingLinks = [{ href: "/#how", label: "How it works" }];

function AccountMenu({
  user,
  onSignOut,
  tone = "app",
}: {
  user: User;
  onSignOut: () => void;
  tone?: "app" | "marketing";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const iconClass =
    tone === "marketing"
      ? "text-[26px] text-[#9CA3AF] transition-colors group-hover:text-[#6B7280]"
      : "text-[28px]";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`group rounded-full p-1 transition-colors ${
          tone === "marketing"
            ? "text-[#9CA3AF] hover:text-[#6B7280]"
            : "text-on-surface-variant hover:bg-surface-container-low"
        }`}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Icon name="account_circle" className={iconClass} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-outline-variant bg-white py-1 shadow-lg"
        >
          <div className="border-b border-outline-variant px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-on-surface-variant">
              Signed in
            </p>
            <p className="mt-0.5 truncate text-body-sm text-on-surface" title={user.email}>
              {user.email}
            </p>
          </div>
          {tone === "marketing" && (
            <Link
              href="/dashboard"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-body-sm text-on-surface hover:bg-surface-container-low"
            >
              <Icon name="dashboard" className="text-[18px]" />
              Dashboard
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-body-sm text-on-surface hover:bg-surface-container-low"
          >
            <Icon name="logout" className="text-[18px]" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar({
  variant = "marketing",
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search documents...",
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [configured]);

  async function signOut() {
    if (!configured) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  if (variant === "marketing") {
    return (
      <nav className="fixed inset-x-0 top-0 z-50 h-16 border-b border-[#EDEDED] bg-white">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-6 md:px-10">
          <div className="flex min-w-0 items-center">
            <Link
              href="/"
              className="shrink-0 cursor-pointer text-[1.375rem] font-bold leading-none tracking-tight text-[#1D4ED8] transition-opacity duration-200 hover:opacity-90"
            >
              DocBot
            </Link>
            <div className="ml-12 hidden items-center gap-6 md:ml-16 md:flex lg:ml-20">
              {marketingLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="cursor-pointer whitespace-nowrap text-[15px] font-normal leading-none text-[#6B7280] transition-colors duration-200 hover:text-[#111827]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-5 md:gap-6">
            {user ? (
              <AccountMenu user={user} onSignOut={signOut} tone="marketing" />
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="hidden cursor-pointer whitespace-nowrap text-[15px] font-medium leading-none text-[#1D4ED8] transition-colors duration-200 hover:text-[#1E40AF] sm:inline"
                >
                  Log In
                </Link>
                <Link
                  href="/auth/login"
                  className="cursor-pointer whitespace-nowrap rounded-full bg-[#2563EB] px-5 py-2 text-sm font-semibold leading-none text-white transition-colors duration-200 hover:bg-[#1D4ED8] active:scale-[0.98]"
                >
                  Sign Up
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex cursor-pointer items-center justify-center text-[#9CA3AF] transition-colors duration-200 hover:text-[#6B7280]"
                  aria-label="Account"
                >
                  <Icon name="account_circle" className="text-[26px]" />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface px-4 md:px-container-padding">
      <div className="flex items-center gap-8">
        <Link
          href="/dashboard"
          className="cursor-pointer text-headline-lg font-bold text-primary transition-opacity duration-200 hover:opacity-90"
        >
          DocBot
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {appLinks.map((link) => {
            const active =
              pathname === link.href ||
              (link.href === "/dashboard" &&
                (pathname.startsWith("/chat") ||
                  pathname.startsWith("/analytics")));
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`cursor-pointer rounded px-2 py-1 text-body-md transition-colors duration-200 ${
                  active
                    ? "border-b-2 border-primary pb-1 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-[#0F172A]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <div className="relative hidden sm:block">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline"
          />
          <input
            type="search"
            value={searchQuery ?? ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-56 rounded-lg border border-outline-variant bg-surface-container-low py-2 pl-10 pr-4 text-body-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary md:w-64"
          />
        </div>

        {!configured ? (
          <span className="hidden rounded-full bg-surface-container-low px-3 py-1.5 font-mono text-label-caps text-on-surface-variant sm:inline">
            Local mode
          </span>
        ) : user ? (
          <AccountMenu user={user} onSignOut={signOut} tone="app" />
        ) : (
          <Link
            href="/auth/login"
            className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
