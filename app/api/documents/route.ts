import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  BILLING_ENABLED,
  FREE_TIER_LIMIT,
  isLocalDevMode,
  isStorageConfigured,
  useDurableDb,
} from "@/lib/config";
import { listDocuments, countDocuments } from "@/lib/documents/store";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        hint: "Sign in again. If this persists on Vercel, check Supabase env vars and redirect URLs.",
      },
      { status: 401 },
    );
  }

  try {
    const documents = await listDocuments(user.id);
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
