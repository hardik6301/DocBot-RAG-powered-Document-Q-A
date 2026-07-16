"use client";

import { useEffect, useState } from "react";
import UpgradeButton from "@/components/billing/UpgradeButton";

export default function ManageBillingButton({
  isPro,
  onDemoToggle,
}: {
  isPro: boolean;
  onDemoToggle: (enabled: boolean) => Promise<void>;
}) {
  const [stripeReady, setStripeReady] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/stripe/checkout")
      .then((r) => r.json())
      .then((d) => setStripeReady(Boolean(d.configured)))
      .catch(() => setStripeReady(false));
  }, []);

  const openPortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Portal unavailable");
      window.location.href = data.url as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Portal failed");
    } finally {
      setPortalLoading(false);
    }
  };

  if (isPro) {
    return (
      <div className="mt-4 space-y-2">
        {stripeReady && (
          <button
            type="button"
            onClick={() => void openPortal()}
            disabled={portalLoading}
            className="block w-full rounded-lg bg-primary py-2 text-center text-body-sm font-semibold text-on-primary transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            {portalLoading ? "Opening…" : "Manage billing"}
          </button>
        )}
        <button
          type="button"
          onClick={() => void onDemoToggle(false)}
          className="block w-full rounded-lg border border-outline-variant py-2 text-center text-body-sm font-semibold text-on-surface transition-all hover:bg-surface-container-low active:scale-95"
        >
          {stripeReady ? "Switch to Free (demo)" : "Switch to Free (demo)"}
        </button>
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {stripeReady ? (
        <UpgradeButton className="block w-full rounded-lg bg-primary py-2 text-center text-body-sm font-semibold text-on-primary transition-all hover:opacity-90 active:scale-95 disabled:opacity-50">
          Upgrade with Stripe
        </UpgradeButton>
      ) : null}
      <button
        type="button"
        onClick={() => void onDemoToggle(true)}
        className={`block w-full rounded-lg py-2 text-center text-body-sm font-semibold transition-all active:scale-95 ${
          stripeReady
            ? "border border-outline-variant text-on-surface hover:bg-surface-container-low"
            : "bg-primary text-on-primary hover:opacity-90"
        }`}
      >
        {stripeReady ? "Unlock Pro (demo)" : "Unlock Pro (demo)"}
      </button>
    </div>
  );
}
