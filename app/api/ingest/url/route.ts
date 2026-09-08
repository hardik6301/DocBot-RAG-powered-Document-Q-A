import { NextResponse } from "next/server";
import { requireUserOrResponse } from "@/lib/auth";
import {
  BILLING_ENABLED,
  FREE_TIER_LIMIT,
} from "@/lib/config";
import {
  countDocuments,
  createDocument,
} from "@/lib/documents/store";
import { deleteUploadFile, saveUploadBytes } from "@/lib/storage/files";
import { RATE, rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { logEvent } from "@/lib/log";
import {
  fetchWebpage,
  sanitizeFilename,
} from "@/lib/webpage";
import { enqueueAndSchedule } from "@/lib/ingest-queue";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  const body = (await request.json().catch(() => null)) as {
    url?: string;
  } | null;
  const rawUrl = body?.url?.trim();
  if (!rawUrl) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let docId: string | null = null;
  let fileUrl: string | null = null;

  try {
    const page = await fetchWebpage(rawUrl);
    const filename = sanitizeFilename(page.title);
    const content = `# ${page.title}\n\nSource: ${page.url}\n\n${page.text}\n`;
    const saved = await saveUploadBytes(user.id, {
      filename,
      bytes: Buffer.from(content, "utf8"),
      contentType: "text/plain; charset=utf-8",
    });
    fileUrl = saved.fileUrl;

    const vectorNs = user.supabaseId || user.id;
    const doc = await createDocument({
      userId: user.id,
      filename,
      fileUrl: saved.fileUrl,
      fileType: "url",
      fileSize: saved.size,
      pageCount: null,
      chunkCount: null,
      pineconeNs: vectorNs,
      status: "processing",
      summary: null,
      keyTopics: null,
      suggestedQuestions: null,
      folder: null,
      tags: ["url"],
      archived: false,
      archivedAt: null,
    });
    docId = doc.id;

    const job = await enqueueAndSchedule({
      documentId: doc.id,
      userId: user.id,
      vectorNs,
      filename,
      fileUrl: saved.fileUrl,
      fileType: "url",
    });

    logEvent("ingest.job.enqueued", {
      userId: user.id,
      docId: doc.id,
      jobId: job.id,
      fileType: "url",
      source: page.url,
    });

    return NextResponse.json(
      { document: doc, jobId: job.id },
      { status: 202, headers: rateLimitHeaders(limited) },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "URL ingest failed";
    logEvent("ingest.failed", {
      level: "error",
      userId: user.id,
      docId,
      fileType: "url",
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
