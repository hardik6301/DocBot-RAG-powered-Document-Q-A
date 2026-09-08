import { NextResponse } from "next/server";
import { requireUserOrResponse } from "@/lib/auth";
import {
  BILLING_ENABLED,
  FREE_TIER_LIMIT,
  useDurableDb,
} from "@/lib/config";
import {
  countDocuments,
  createDocument,
  detectFileType,
  isAllowedFile,
  updateDocument,
} from "@/lib/documents/store";
import { deleteUploadFile, saveUploadFile } from "@/lib/storage/files";
import { ingestDocument } from "@/lib/ingest";
import { RATE, rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { logEvent } from "@/lib/log";

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
          "Only PDF, PPT, DOC, TXT, and Markdown files are allowed",
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
  const started = Date.now();

  try {
    const saved = await saveUploadFile(user.id, file);
    fileUrl = saved.fileUrl;
    const fileType = detectFileType(file.name);

    // Pinecone namespace must stay stable across Prisma cuid vs auth UUID.
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

    const result = await ingestDocument({
      userId: vectorNs,
      docId: doc.id,
      filename: file.name,
      fileUrl: saved.fileUrl,
      fileType,
    });

    const patch = {
      status: "ready" as const,
      pageCount: result.pageCount,
      chunkCount: result.chunkCount,
      summary: result.intelligence?.summary ?? null,
      keyTopics: result.intelligence?.keyTopics ?? null,
      suggestedQuestions: result.intelligence?.suggestedQuestions ?? null,
    };

    let ready = await updateDocument(doc.id, user.id, patch);

    // Direct write by primary key — avoids stuck "processing" if userId lookup misses.
    if (!ready && useDurableDb()) {
      try {
        const prisma = (await import("@/lib/prisma")).default;
        const { Prisma } = await import("@prisma/client");
        const row = await prisma.document.update({
          where: { id: doc.id },
          data: {
            status: patch.status,
            pageCount: patch.pageCount,
            chunkCount: patch.chunkCount,
            summary: patch.summary,
            keyTopics:
              patch.keyTopics === null
                ? Prisma.DbNull
                : patch.keyTopics ?? undefined,
            suggestedQuestions:
              patch.suggestedQuestions === null
                ? Prisma.DbNull
                : patch.suggestedQuestions ?? undefined,
          },
        });
        ready = {
          ...doc,
          status: row.status as "ready",
          pageCount: row.pageCount,
          chunkCount: row.chunkCount,
          summary: row.summary ?? null,
          keyTopics: Array.isArray(row.keyTopics)
            ? (row.keyTopics as string[])
            : null,
          suggestedQuestions: Array.isArray(row.suggestedQuestions)
            ? (row.suggestedQuestions as string[])
            : null,
          folder: row.folder ?? null,
          tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
          archived: Boolean(row.archived),
          archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
          updatedAt: row.updatedAt.toISOString(),
        };
      } catch (e) {
        console.error("direct ready status update failed", e);
      }
    }

    const document = ready ?? {
      ...doc,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    logEvent("ingest.complete", {
      userId: user.id,
      docId: document.id,
      fileType,
      pageCount: document.pageCount,
      chunkCount: document.chunkCount,
      ms: Date.now() - started,
    });

    return NextResponse.json(
      { document },
      { status: 201, headers: rateLimitHeaders(limited) },
    );
  } catch (e) {
    console.error("upload/ingest failed", e);
    const message = e instanceof Error ? e.message : "Upload failed";
    logEvent("ingest.failed", {
      level: "error",
      userId: user.id,
      docId,
      ms: Date.now() - started,
      error: message,
    });

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
