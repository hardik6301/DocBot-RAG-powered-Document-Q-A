import { NextResponse } from "next/server";
import { requireUserOrResponse } from "@/lib/auth";
import { canChat, getAccessibleDocument } from "@/lib/access";
import { readUploadBytes } from "@/lib/storage/files";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await requireUserOrResponse();
  if (user instanceof Response) return user;

  const access = await getAccessibleDocument(params.id, user);
  if (!access || !canChat(access.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { bytes, contentType } = await readUploadBytes(
      access.document.fileUrl,
    );
    const filename = access.document.filename.replace(/"/g, "");
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.length),
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    console.error("GET /api/documents/[id]/file failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "File unavailable" },
      { status: 404 },
    );
  }
}
