"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Icon from "@/components/ui/Icon";

function ConfirmBody() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "ok" | "error">(
    sessionId ? "loading" : "error",
  );
  const [message, setMessage] = useState(
    sessionId ? "Confirming your subscription…" : "Missing checkout session.",
  );

  useEffect(() => {
    if (!sessionId) return;
    void (async () => {
      try {
        const res = await fetch("/api/stripe/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not activate Pro");
        setStatus("ok");
        setMessage(
          "Pro is active. Unlimited uploads and Pro tools are unlocked.",
        );
      } catch (e) {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Activation failed");
      }
    })();
  }, [sessionId]);

  return (
    <>
      <Icon
        name={
          status === "ok"
            ? "verified"
            : status === "loading"
              ? "progress_activity"
              : "error"
        }
        className={`mb-4 text-[48px] ${
          status === "ok"
            ? "text-primary"
            : status === "error"
              ? "text-error"
              : "animate-spin text-outline"
        }`}
      />
      <h1 className="text-headline-xl text-on-surface">
        {status === "ok"
          ? "Welcome to Pro"
          : status === "loading"
            ? "Almost there"
            : "Billing issue"}
      </h1>
      <p className="mt-3 text-body-md text-on-surface-variant">{message}</p>
    </>
  );
}

export default function BillingSuccessPage() {
  return (
    <div className="min-h-[100dvh] bg-surface">
      <Navbar variant="app" />
      <main className="mx-auto flex max-w-lg flex-col items-center px-6 pb-24 pt-32 text-center">
        <Suspense
          fallback={
            <p className="text-body-md text-on-surface-variant">Loading…</p>
          }
        >
          <ConfirmBody />
        </Suspense>
        <Link
          href="/dashboard"
          className="mt-8 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary"
        >
          Go to dashboard
        </Link>
      </main>
    </div>
  );
}
