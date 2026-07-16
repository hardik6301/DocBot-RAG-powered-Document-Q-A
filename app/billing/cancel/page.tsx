import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Icon from "@/components/ui/Icon";

export default function BillingCancelPage() {
  return (
    <div className="min-h-[100dvh] bg-surface">
      <Navbar variant="app" />
      <main className="mx-auto flex max-w-lg flex-col items-center px-6 pb-24 pt-32 text-center">
        <Icon name="cancel" className="mb-4 text-[48px] text-outline" />
        <h1 className="text-headline-xl text-on-surface">Checkout canceled</h1>
        <p className="mt-3 text-body-md text-on-surface-variant">
          No charge was made. You can upgrade anytime from pricing or the
          dashboard.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/#pricing"
            className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary"
          >
            View pricing
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-outline-variant px-6 py-3 text-sm font-semibold text-on-surface"
          >
            Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
