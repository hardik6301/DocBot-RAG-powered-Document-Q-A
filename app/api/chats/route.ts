import { NextResponse } from "next/server";
import { requireUserOrResponse } from "@/lib/auth";
import { listChatSummaries } from "@/lib/chat/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUserOrResponse();
    if (user instanceof Response) return user;

    const chats = await listChatSummaries(user.id);
    return NextResponse.json({ chats });
  } catch (e) {
    console.error("GET /api/chats failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load chats" },
      { status: 500 },
    );
  }
}
