"use client";

import { useEffect, useState } from "react";

type Status = {
  durableDb: boolean;
  storage: string;
  localMode: boolean;
};

export default function DeployBanner() {
  const onVercel = Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    if (!onVercel) return;
    fetch("/api/documents")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        setStatus({
          durableDb: Boolean(data.durableDb),
          storage: data.storage === "supabase" ? "supabase" : "local",
          localMode: Boolean(data.localMode),
        });
      })
      .catch(() => {});
  }, [onVercel]);

  if (!onVercel) return null;

  const durable =
    status?.durableDb && status.storage === "supabase" && !status.localMode;

  return (
    <div className="mb-4 rounded-xl border border-primary/20 bg-primary-fixed/60 px-4 py-3 text-body-sm text-on-primary-fixed">
      {durable ? (
        <>
          <strong>Deployed on Vercel.</strong> Auth, file storage, and document
          metadata are connected to Supabase/Postgres. Vectors live in Pinecone.
        </>
      ) : (
        <>
          <strong>Deployed on Vercel.</strong> Vectors live in Pinecone. For
          durable Auth/DB/files, set cloud{" "}
          <code className="rounded bg-white/40 px-1">DATABASE_URL</code> +
          Supabase keys in Vercel (not localhost), then run{" "}
          <code className="rounded bg-white/40 px-1">npx prisma db push</code>.
        </>
      )}
    </div>
  );
}
