import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documents = await listDocuments(user.id);
  const used = await countDocuments(user.id);

  return NextResponse.json({
    documents,
    usage: {
      used,
      limit: user.isPro ? null : FREE_TIER_LIMIT,
    },
    isPro: user.isPro,
    localMode: isLocalDevMode(),
    durableDb: useDurableDb(),
    storage: isStorageConfigured() ? "supabase" : "local",
  });
}
