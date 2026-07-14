import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { FREE_TIER_LIMIT } from "@/lib/config";
import {
  countDocuments,
  createDocument,
  detectFileType,
  isAllowedFile,
  updateDocument,
} from "@/lib/documents/store";
import { saveLocalFile } from "@/lib/storage/local";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024; // 25MB

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const used = await countDocuments(user.id);
  if (!user.isPro && used >= FREE_TIER_LIMIT) {
    return NextResponse.json(
      {
        error: `Free tier limit reached (${FREE_TIER_LIMIT} documents). Delete a document or upgrade.`,
      },
      { status: 403 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (!isAllowedFile(file.name, file.type)) {
    return NextResponse.json(
      { error: "Only PDF, PPT, and DOC files are allowed" },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 25MB)" },
      { status: 400 },
    );
  }

  try {
    const saved = await saveLocalFile(user.id, file);
    const fileType = detectFileType(file.name);

    const doc = await createDocument({
      userId: user.id,
      filename: file.name,
      fileUrl: saved.fileUrl,
      fileType,
      fileSize: saved.size,
      pageCount: null,
      chunkCount: null,
      pineconeNs: user.id,
      status: "processing",
    });

    // Phase 2 stub: mark ready without RAG (Phase 3 wires real ingestion)
    const ready = await updateDocument(doc.id, user.id, {
      status: "ready",
      pageCount: 1,
      chunkCount: 0,
    });

    return NextResponse.json({ document: ready ?? doc }, { status: 201 });
  } catch (e) {
    console.error("upload failed", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
