import { NextResponse } from "next/server";
import { requireUserOrResponse } from "@/lib/auth";
import {
  BILLING_ENABLED,
  FREE_TIER_LIMIT,
  isLocalDevMode,
  isStorageConfigured,
  useDurableDb,
} from "@/lib/config";
import { listAccessibleDocuments } from "@/lib/access";
import { countDocuments } from "@/lib/documents/store";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUserOrResponse();
  if (user instanceof Response) return user;

  try {
    const documents = await listAccessibleDocuments(user);
    const used = await countDocuments(user.id);

    return NextResponse.json({
      documents,
      usage: {
        used,
        limit: !BILLING_ENABLED || user.isPro ? null : FREE_TIER_LIMIT,
      },
      isPro: user.isPro,
      billingEnabled: BILLING_ENABLED,
      localMode: isLocalDevMode(),
      durableDb: useDurableDb(),
      storage: isStorageConfigured() ? "supabase" : "local",
    });
  } catch (e) {
    console.error("GET /api/documents failed", e);
    const message = e instanceof Error ? e.message : "Failed to load documents";
    const looksLikeDb =
      /database|prisma|p1001|p1000|can't reach|econnrefused|127\.0\.0\.1/i.test(
        message,
      );
    return NextResponse.json(
      {
        error: looksLikeDb
          ? "Database unavailable. On Vercel, DATABASE_URL must be cloud Postgres (not 127.0.0.1). Run npx prisma db push against that URL."
          : message,
      },
      { status: 503 },
    );
  }
}
