import { NextResponse } from "next/server";
import { requireUserOrResponse } from "@/lib/auth";
import {
  BILLING_ENABLED,
  FREE_TIER_LIMIT,
} from "@/lib/config";
import {
  countDocuments,
  createDocument,
  detectFileType,
  isAllowedFile,
} from "@/lib/documents/store";
import { deleteUploadFile, saveUploadFile } from "@/lib/storage/files";
import { RATE, rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { logEvent } from "@/lib/log";
import { enqueueAndSchedule } from "@/lib/ingest-queue";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await requireUserOrResponse();
  if (user instanceof Response) return user;

  const limited = rateLimit(
    `upload:${user.id}`,
    RATE.upload.limit,
    RATE.upload.windowMs,
  );
  if (!limited.ok) {
    return NextResponse.json(
      {
        error: `Upload rate limit exceeded. Try again in ${limited.retryAfterSec}s.`,
      },
      { status: 429, headers: rateLimitHeaders(limited) },
    );
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
      {
        error:
          "Only PDF, PPT, DOC, TXT, Markdown, and EPUB files are allowed",
      },
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
    const vectorNs = user.supabaseId || user.id;

    const doc = await createDocument({
      userId: user.id,
      filename: file.name,
      fileUrl: saved.fileUrl,
      fileType,
      fileSize: saved.size,
      pageCount: null,
      chunkCount: null,
      pineconeNs: vectorNs,
      status: "processing",
      summary: null,
      keyTopics: null,
      suggestedQuestions: null,
      folder: null,
      tags: [],
      archived: false,
      archivedAt: null,
    });
    docId = doc.id;

    const job = await enqueueAndSchedule({
      documentId: doc.id,
      userId: user.id,
      vectorNs,
      filename: file.name,
      fileUrl: saved.fileUrl,
      fileType,
    });

    logEvent("ingest.job.enqueued", {
      userId: user.id,
      docId: doc.id,
      jobId: job.id,
      fileType,
    });

    return NextResponse.json(
      { document: doc, jobId: job.id },
      { status: 202, headers: rateLimitHeaders(limited) },
    );
  } catch (e) {
    console.error("upload enqueue failed", e);
    const message = e instanceof Error ? e.message : "Upload failed";
    logEvent("ingest.failed", {
      level: "error",
      userId: user.id,
      docId,
      error: message,
    });

    if (fileUrl && !docId) {
      await deleteUploadFile(fileUrl);
    }

    return NextResponse.json(
      { error: message, documentId: docId },
      { status: 500 },
    );
  }
}
