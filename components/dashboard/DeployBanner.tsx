"use client";

export default function DeployBanner() {
  const onVercel = Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV);
  if (!onVercel) return null;

  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("supabase.co"),
  );

  return (
    <div className="mb-4 rounded-xl border border-primary/20 bg-primary-fixed/60 px-4 py-3 text-body-sm text-on-primary-fixed">
      {supabaseConfigured ? (
        <>
          <strong>Deployed on Vercel.</strong> Auth, file storage, and document
          metadata are connected to Supabase/Postgres. Vectors live in Pinecone.
        </>
      ) : (
        <>
          <strong>Deployed on Vercel.</strong> Set cloud Supabase +{" "}
          <code className="rounded bg-white/40 px-1">DATABASE_URL</code> in
          Vercel env for durable Auth/DB/files.
        </>
      )}
    </div>
  );
}
