import { NextResponse } from "next/server";
import { requireUserOrResponse } from "@/lib/auth";
import {
  getIngestJob,
  getLatestJobForDocument,
  processIngestJob,
} from "@/lib/ingest-queue";
import { resolveOwnerId } from "@/lib/documents/prisma-store";
import { useDurableDb } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Run (or resume) an ingest job.
 * Auth: signed-in owner, or INGEST_WORKER_SECRET / CRON_SECRET bearer.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    jobId?: string;
    documentId?: string;
  } | null;

  const workerSecret =
    process.env.INGEST_WORKER_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const isWorker = Boolean(workerSecret && bearer && bearer === workerSecret);

  let userId: string | null = null;
  if (!isWorker) {
    const user = await requireUserOrResponse();
    if (user instanceof Response) return user;
    userId = user.id;
  }

  let jobId = body?.jobId?.trim() || "";
  if (!jobId && body?.documentId) {
    const latest = await getLatestJobForDocument(body.documentId);
    if (!latest) {
      return NextResponse.json(
        { error: "No ingest job for document" },
        { status: 404 },
      );
    }
    jobId = latest.id;
  }

  if (!jobId) {
    return NextResponse.json(
      { error: "jobId or documentId is required" },
      { status: 400 },
    );
  }

  const existing = await getIngestJob(jobId);
  if (!existing) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (!isWorker && userId) {
    let allowed = existing.userId === userId;
    if (!allowed && useDurableDb()) {
      const ownerId = await resolveOwnerId(userId);
      allowed = Boolean(
        ownerId &&
          (existing.userId === ownerId || existing.userId === userId),
      );
    }
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const job = await processIngestJob(jobId);
    return NextResponse.json({ job });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ingest run failed" },
      { status: 500 },
    );
  }
}
