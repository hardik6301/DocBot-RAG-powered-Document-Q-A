"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Icon from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";

type NavbarProps = {
  variant?: "marketing" | "app";
};

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "#", label: "History" },
  { href: "#", label: "Resources" },
];

export default function Navbar({ variant = "marketing" }: NavbarProps) {
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

  return (
    <nav className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface px-4 md:px-container-padding">
      <div className="flex items-center gap-8">
        <Link
          href="/"
          className="text-headline-lg font-bold text-primary transition-opacity hover:opacity-90"
        >
          DocBot
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {links.map((link) => {
            const active =
              link.href !== "#" &&
              (pathname === link.href ||
                (link.href === "/dashboard" && pathname.startsWith("/chat")));
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`rounded px-2 py-1 text-body-md transition-colors ${
                  active
                    ? "border-b-2 border-primary pb-1 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        {variant === "app" && (
          <div className="relative hidden sm:block">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline"
            />
            <input
              type="search"
              placeholder="Search documents..."
              className="w-56 rounded-lg border border-outline-variant bg-surface-container-low py-2 pl-10 pr-4 text-body-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary md:w-64"
            />
          </div>
        )}

        {user ? (
          <>
            <span className="hidden max-w-[140px] truncate text-body-sm text-on-surface-variant sm:inline">
              {user.email}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg px-3 py-2 text-body-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/auth/login"
              className="hidden rounded-lg px-4 py-2 text-body-md text-primary transition-colors hover:bg-surface-container-low sm:block"
            >
              Log In
            </Link>
            <Link
              href="/auth/login"
              className="rounded-full bg-primary-container px-5 py-2 text-sm font-semibold text-on-primary-container transition-all hover:opacity-90 active:scale-95 md:px-6"
            >
              Sign Up
            </Link>
          </>
        )}
        <button
          type="button"
          className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container-low"
          aria-label="Account"
        >
          <Icon name="account_circle" className="text-[28px]" />
        </button>
      </div>
    </nav>
  );
}
