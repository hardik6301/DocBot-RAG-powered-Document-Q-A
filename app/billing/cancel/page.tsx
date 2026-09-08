import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import Icon from "@/components/ui/Icon";

export default function BillingCancelPage() {
  return (
    <AppShell>
      <main className="mx-auto flex max-w-lg flex-col items-center px-6 pb-24 pt-16 text-center">
        <Icon name="cancel" className="mb-4 text-[48px] text-outline" />
        <h1 className="text-headline-xl text-on-surface">Checkout canceled</h1>
        <p className="mt-3 text-body-md text-on-surface-variant">
          No charge was made. Return to your dashboard to keep using DocBot.
        </p>
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary"
          >
            Dashboard
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
