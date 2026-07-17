import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { BILLING_ENABLED, FREE_TIER_LIMIT } from "@/lib/config";
import {
  countDocuments,
  createDocument,
  detectFileType,
  isAllowedFile,
  updateDocument,
} from "@/lib/documents/store";
import { deleteUploadFile, saveUploadFile } from "@/lib/storage/files";
import { ingestDocument } from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const used = await countDocuments(user.id);
  if (BILLING_ENABLED && !user.isPro && used >= FREE_TIER_LIMIT) {
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

  let docId: string | null = null;
  let fileUrl: string | null = null;

  try {
    const saved = await saveUploadFile(user.id, file);
    fileUrl = saved.fileUrl;
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
    docId = doc.id;

    const result = await ingestDocument({
      userId: user.id,
      docId: doc.id,
      filename: file.name,
      fileUrl: saved.fileUrl,
      fileType,
    });

    const ready = await updateDocument(doc.id, user.id, {
      status: "ready",
      pageCount: result.pageCount,
      chunkCount: result.chunkCount,
    });

    return NextResponse.json({ document: ready ?? doc }, { status: 201 });
  } catch (e) {
    console.error("upload/ingest failed", e);
    const message = e instanceof Error ? e.message : "Upload failed";

    if (docId) {
      await updateDocument(docId, user.id, { status: "failed" });
    } else if (fileUrl) {
      await deleteUploadFile(fileUrl);
    }

    return NextResponse.json(
      {
        error: message,
        documentId: docId,
      },
      { status: 500 },
    );
  }
}
