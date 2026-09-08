import { NextResponse } from "next/server";
import { requireUserOrResponse } from "@/lib/auth";
import {
  acceptShareByToken,
  listPendingSharesForEmail,
  revokeShare,
} from "@/lib/sharing";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUserOrResponse();
  if (user instanceof Response) return user;

  const pending = await listPendingSharesForEmail(user.email);
  return NextResponse.json({ pending });
}

export async function POST(request: Request) {
  const user = await requireUserOrResponse();
  if (user instanceof Response) return user;

  const body = (await request.json().catch(() => null)) as {
    token?: string;
    shareId?: string;
    action?: "accept" | "revoke";
  } | null;

  if (body?.action === "revoke" && body.shareId) {
    const revoked = await revokeShare(body.shareId, user.id);
    if (!revoked) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ share: revoked });
  }

  if (!body?.token?.trim()) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  try {
    const share = await acceptShareByToken(body.token.trim(), user);
    return NextResponse.json({ share });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Accept failed" },
      { status: 400 },
    );
  }
}
