"use client";

export default function DeployBanner() {
  const show = Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV);
  if (!show) return null;

  return (
    <div className="mb-4 rounded-xl border border-primary/20 bg-primary-fixed/60 px-4 py-3 text-body-sm text-on-primary-fixed">
      <strong>Deployed on Vercel.</strong> Document metadata + vectors live in
      Pinecone. Chat history uses ephemeral server storage until Supabase is
      connected — recent chats may reset after idle periods.
    </div>
  );
}
