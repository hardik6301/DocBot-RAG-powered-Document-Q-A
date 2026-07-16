import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { activateProFromStripe } from "@/lib/settings";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

/** Verify Checkout session and activate Pro (works without webhook for local/dev). */
export async function POST(request: Request) {
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

  const body = (await request.json().catch(() => null)) as {
    sessionId?: string;
  } | null;

  if (!body?.sessionId?.startsWith("cs_")) {
    return NextResponse.json(
      { error: "Valid sessionId is required" },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(body.sessionId);

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json(
        { error: "Checkout session is not complete" },
        { status: 400 },
      );
    }

    const metaUser = session.metadata?.userId ?? session.client_reference_id;
    if (metaUser && metaUser !== user.id) {
      return NextResponse.json({ error: "Session user mismatch" }, { status: 403 });
    }

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

    const settings = await activateProFromStripe({
      customerId,
      subscriptionId,
      userId: user.id,
    });

    return NextResponse.json({ ok: true, settings });
  } catch (e) {
    console.error("stripe confirm failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Confirm failed" },
      { status: 500 },
    );
  }
}
