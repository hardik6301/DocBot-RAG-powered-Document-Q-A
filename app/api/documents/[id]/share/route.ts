import { NextResponse } from "next/server";
import { requireUserOrResponse } from "@/lib/auth";
import { canManageShares, getAccessibleDocument } from "@/lib/access";
import {
  createDocumentShare,
  listSharesForDocument,
} from "@/lib/sharing";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await requireUserOrResponse();
  if (user instanceof Response) return user;

  const access = await getAccessibleDocument(params.id, user);
  if (!access || !canManageShares(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const shares = await listSharesForDocument(params.id);
  return NextResponse.json({ shares });
}

export async function POST(request: Request, { params }: Ctx) {
  const user = await requireUserOrResponse();
  if (user instanceof Response) return user;

  const access = await getAccessibleDocument(params.id, user);
  if (!access || !canManageShares(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    role?: "viewer" | "editor";
  } | null;

  if (!body?.email?.trim()) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  try {
    const share = await createDocumentShare({
      documentId: params.id,
      email: body.email,
      role: body.role === "editor" ? "editor" : "viewer",
      invitedByUserId: user.id,
    });
    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    const acceptUrl = origin
      ? `${origin}/share/accept?token=${share.token}`
      : `/share/accept?token=${share.token}`;

    return NextResponse.json({ share, acceptUrl }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Share failed" },
      { status: 400 },
    );
  }
}
