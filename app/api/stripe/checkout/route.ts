import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import {
  appBaseUrl,
  getStripe,
  isStripeConfigured,
  stripePriceId,
} from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ configured: isStripeConfigured() });
}

export async function POST() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID, or use the demo Pro toggle.",
        configured: false,
      },
      { status: 503 },
    );
  }

  if (user.isPro) {
    return NextResponse.json(
      { error: "Already on Pro. Manage billing from the portal." },
      { status: 409 },
    );
  }

  try {
    const stripe = getStripe();
    const settings = await getSettings();
    const base = appBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: stripePriceId(), quantity: 1 }],
      success_url: `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/billing/cancel`,
      client_reference_id: user.id,
      customer: settings.stripeCustomerId ?? undefined,
      customer_email: settings.stripeCustomerId
        ? undefined
        : user.email,
      metadata: {
        userId: user.id,
        email: user.email,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("stripe checkout failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout failed" },
      { status: 500 },
    );
  }
}
