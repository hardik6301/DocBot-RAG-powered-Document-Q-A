"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/ui/Icon";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(
    authError ? "Authentication failed. Please try again." : null,
  );

  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  async function handleGoogle() {
    if (!configured) {
      setMessage("Add Supabase keys to .env.local to enable auth.");
      return;
    }
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  }

  async function handleEmail(e: FormEvent) {
    e.preventDefault();
    if (!configured) {
      setMessage("Add Supabase keys to .env.local to enable auth.");
      return;
    }
    setLoading(true);
    setMessage(null);
    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      setLoading(false);
      if (error) {
        setMessage(error.message);
        return;
      }
      setMessage("Check your email to confirm your account.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 shadow-soft">
      <Link href="/" className="text-headline-lg font-bold text-primary">
        DocBot
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-on-surface">
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-2 text-body-sm text-on-surface-variant">
        Sign in to upload documents and ask grounded questions.
      </p>

      {!configured && (
        <div className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-body-sm text-amber-900">
          <p>
            Local mode — Supabase is not configured. You can use the app without
            sign-in.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
          >
            Continue to dashboard →
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant bg-white py-3 text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container-low active:scale-[0.98] disabled:opacity-60"
      >
        <Icon name="login" className="text-primary" />
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-outline-variant" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-outline">
          or email
        </span>
        <div className="h-px flex-1 bg-outline-variant" />
      </div>

      <form onSubmit={handleEmail} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-body-sm font-medium text-on-surface">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 text-body-md outline-none transition-all focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-body-sm font-medium text-on-surface">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 text-body-md outline-none transition-all focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-xl bg-primary py-3 font-semibold text-on-primary transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
        >
          {loading
            ? "Please wait…"
            : mode === "signin"
              ? "Sign In"
              : "Sign Up"}
        </button>
      </form>

      {message && (
        <p className="mt-4 text-center text-body-sm text-on-surface-variant">
          {message}
        </p>
      )}

      <p className="mt-6 text-center text-body-sm text-on-surface-variant">
        {mode === "signin" ? (
          <>
            No account?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setMessage(null);
              }}
              className="font-medium text-primary"
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setMessage(null);
              }}
              className="font-medium text-primary"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
