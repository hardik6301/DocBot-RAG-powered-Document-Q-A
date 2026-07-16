import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSettings, setPro } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await getSettings();
  return NextResponse.json({
    isPro: settings.isPro || user.isPro,
    proSince: settings.proSince,
  });
}

/** Demo toggle — replace with Stripe webhook later. */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    isPro?: boolean;
  } | null;

  if (typeof body?.isPro !== "boolean") {
    return NextResponse.json({ error: "isPro boolean required" }, { status: 400 });
  }

  const settings = await setPro(body.isPro);
  return NextResponse.json(settings);
}
