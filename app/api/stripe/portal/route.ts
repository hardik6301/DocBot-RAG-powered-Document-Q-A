import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { appBaseUrl, getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 },
    );
  }

  const settings = await getSettings();
  if (!settings.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer on file. Upgrade first." },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: settings.stripeCustomerId,
      return_url: `${appBaseUrl()}/dashboard`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("stripe portal failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Portal failed" },
      { status: 500 },
    );
  }
}
