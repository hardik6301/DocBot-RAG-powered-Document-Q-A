"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Icon from "@/components/ui/Icon";

export default function ShareAcceptClient() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [status, setStatus] = useState<"idle" | "working" | "ok" | "err">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [docId, setDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("err");
      setMessage("Missing invite token.");
      return;
    }
    void (async () => {
      setStatus("working");
      try {
        const res = await fetch("/api/shares", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          share?: { documentId: string };
        };
        if (!res.ok) throw new Error(data.error || "Could not accept invite");
        setDocId(data.share?.documentId ?? null);
        setStatus("ok");
        setMessage("Invite accepted. The document is now in your library.");
      } catch (e) {
        setStatus("err");
        setMessage(e instanceof Error ? e.message : "Accept failed");
      }
    })();
  }, [token]);

  return (
    <div className="min-h-[100dvh] bg-surface">
      <Navbar variant="app" />
      <main className="mx-auto max-w-lg px-4 pb-24 pt-28">
        <div className="rounded-2xl border border-outline-variant bg-white p-8 text-center shadow-sm">
          <Icon
            name={status === "ok" ? "check_circle" : "share"}
            className="mb-3 text-[40px] text-primary"
          />
          <h1 className="text-headline-lg text-on-surface">Shared document</h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            {status === "working" ? "Accepting invite…" : message}
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {status === "ok" && docId && (
              <button
                type="button"
                onClick={() => router.push(`/chat/${docId}`)}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
              >
                Open chat
              </button>
            )}
            <Link
              href="/dashboard"
              className="rounded-full border border-outline-variant px-5 py-2.5 text-sm font-medium text-on-surface"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
