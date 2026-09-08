import { NextResponse } from "next/server";
import { requireUserOrResponse } from "@/lib/auth";
import { updateChatTitle } from "@/lib/chat/store";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

export async function PATCH(request: Request, { params }: Ctx) {
  const user = await requireUserOrResponse();
  if (user instanceof Response) return user;

  const body = (await request.json().catch(() => null)) as {
    title?: string;
  } | null;

  const title = body?.title?.trim();
  if (!title || title.length > 120) {
    return NextResponse.json(
      { error: "title must be 1–120 characters" },
      { status: 400 },
    );
  }

  const updated = await updateChatTitle(params.id, user.id, title);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, title });
}
