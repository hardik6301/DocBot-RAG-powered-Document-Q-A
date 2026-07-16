"use client";

import { useState } from "react";

type Props = {
  className?: string;
  children: React.ReactNode;
  /** Called when Stripe is not configured so parent can fall back (e.g. demo toggle). */
  onUnavailable?: () => void;
};

export default function UpgradeButton({
  className,
  children,
  onUnavailable,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (res.status === 503) {
        onUnavailable?.();
        if (!onUnavailable) {
          setError(data.error || "Stripe not configured");
        }
        return;
      }
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (!data.url) throw new Error("No checkout URL");
      window.location.href = data.url as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => void startCheckout()}
        disabled={loading}
        className={className}
      >
        {loading ? "Redirecting…" : children}
      </button>
      {error && (
        <p className="mt-2 text-center text-xs text-error">{error}</p>
      )}
    </div>
  );
}
