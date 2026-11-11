"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Icon from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";

type NavbarProps = {
  variant?: "marketing" | "app";
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onMenuClick?: () => void;
};

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

  const initials = (user.email?.slice(0, 2) || "DB").toUpperCase();

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)] ${
          tone === "marketing"
            ? "text-[color:var(--color-muted)] hover:text-[color:var(--color-ink-2)]"
            : "p-0.5 hover:bg-surface-container-low"
        }`}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {tone === "app" ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--color-ink)] text-[12px] font-semibold text-[color:var(--color-paper-2)]">
            {initials}
          </span>
        ) : (
          <Icon name="account_circle" className="text-[26px]" />
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden border border-[color:var(--color-rule)] bg-[color:var(--color-paper-2)] py-1 shadow-lg"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <div className="border-b border-[color:var(--color-rule)] px-3 py-2.5">
            <p className="hm-label">Signed in</p>
            <p
              className="mt-0.5 truncate text-body-sm text-on-surface"
              title={user.email}
            >
              {user.email}
            </p>
          </div>
          {tone === "marketing" && (
            <Link
              href="/dashboard"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-body-sm text-on-surface transition-colors duration-200 hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--color-focus)]"
            >
              <Icon name="dashboard" className="text-[18px]" />
              Dashboard
            </Link>
          )}
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-body-sm text-on-surface transition-colors duration-200 hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--color-focus)]"
          >
            <Icon name="settings" className="text-[18px]" />
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-body-sm text-on-surface transition-colors duration-200 hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--color-focus)]"
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
  onMenuClick,
}: NavbarProps) {
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
      <nav className="fixed inset-x-0 top-0 z-[var(--z-sticky-nav)] h-16 border-b border-[color:var(--color-rule)] bg-[color:var(--color-paper-2)]">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-6 md:px-10">
          <div className="flex min-w-0 items-center">
            <Link
              href="/"
              className="shrink-0 cursor-pointer text-[1.375rem] font-bold leading-none tracking-tight text-[color:var(--color-focus)] transition-opacity duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)]"
            >
              DocBot
            </Link>
            <div className="ml-12 hidden items-center gap-6 md:ml-16 md:flex lg:ml-20">
              {marketingLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="cursor-pointer whitespace-nowrap text-[15px] font-normal leading-none text-[color:var(--color-ink-2)] transition-colors duration-200 hover:text-[color:var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)]"
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
                  className="hidden cursor-pointer whitespace-nowrap text-[15px] font-medium leading-none text-[color:var(--color-focus)] transition-colors duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)] sm:inline"
                >
                  Log In
                </Link>
                <Link href="/auth/login" className="btn-primary !min-h-9 !px-5 !text-sm">
                  Sign Up
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex cursor-pointer items-center justify-center text-[color:var(--color-muted)] transition-colors duration-200 hover:text-[color:var(--color-ink-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)]"
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
    <nav className="sticky top-0 z-30 flex h-16 w-full items-center gap-3 border-b border-outline-variant bg-[color:var(--color-paper-2)] px-4 md:px-6">
      <button
        type="button"
        className="rounded-lg p-2 text-on-surface-variant transition-colors duration-200 hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)] lg:hidden"
        aria-label="Open menu"
        onClick={onMenuClick}
      >
        <Icon name="menu" className="text-[22px]" />
      </button>

      <div className="mx-auto hidden min-w-0 max-w-xl flex-1 sm:block">
        <div className="relative">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline"
          />
          <input
            id="app-top-search"
            type="search"
            value={searchQuery ?? ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-outline-variant bg-surface-container-low py-2 pl-10 pr-14 text-body-sm outline-none transition-colors duration-200 focus:border-[color:var(--color-accent)] focus:ring-2 focus:ring-[color:var(--color-accent)]"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-outline-variant bg-[color:var(--color-paper-2)] px-1.5 py-0.5 text-[10px] font-medium text-outline">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {!configured ? (
          <span className="hm-label hidden rounded-full bg-surface-container-low px-3 py-1.5 sm:inline">
            Local mode
          </span>
        ) : user ? (
          <AccountMenu user={user} onSignOut={signOut} tone="app" />
        ) : (
          <Link href="/auth/login" className="btn-primary !min-h-9 !px-5 !text-sm">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
