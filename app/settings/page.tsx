"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import AppShell from "@/components/layout/AppShell";
import Icon from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [configured]);

  async function signOut() {
    if (!configured) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <AppShell searchPlaceholder="Search documents…">
      <main className="mx-auto max-w-lg px-4 py-10 md:px-8">
        <h1 className="text-headline-xl text-on-surface">Settings</h1>
        <p className="mt-1 text-on-surface-variant">
          Account preferences for DocBot.
        </p>

        <section className="mt-8 rounded-2xl border border-outline-variant bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0F172A] text-sm font-semibold text-white">
              {(user?.email?.slice(0, 2) || "DB").toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-on-surface">Account</p>
              <p className="truncate text-body-sm text-on-surface-variant">
                {user?.email || (configured ? "Loading…" : "Local mode")}
              </p>
            </div>
          </div>

          {configured && user && (
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-low"
            >
              <Icon name="logout" className="text-[18px]" />
              Sign out
            </button>
          )}
        </section>
      </main>
    </AppShell>
  );
}
