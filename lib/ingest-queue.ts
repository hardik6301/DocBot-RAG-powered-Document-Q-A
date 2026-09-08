import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { useDurableDb } from "@/lib/config";
import { dataDir } from "@/lib/paths";
import prisma from "@/lib/prisma";
import { ingestDocument } from "@/lib/ingest";
import { updateDocument } from "@/lib/documents/store";
import { logEvent } from "@/lib/log";
import { runInBackground } from "@/lib/background";

export type IngestJobRecord = {
  id: string;
  documentId: string;
  userId: string;
  vectorNs: string;
  filename: string;
  fileUrl: string;
  fileType: string;
  status: "pending" | "running" | "succeeded" | "failed";
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EnqueueIngestInput = {
  documentId: string;
  userId: string;
  vectorNs: string;
  filename: string;
  fileUrl: string;
  fileType: string;
  maxAttempts?: number;
};

const DATA_FILE = () => path.join(dataDir(), "ingest-jobs.json");

type StoreShape = { jobs: IngestJobRecord[] };

async function ensureLocal(): Promise<StoreShape> {
  await fs.mkdir(dataDir(), { recursive: true });
  try {
    const raw = await fs.readFile(DATA_FILE(), "utf8");
    return JSON.parse(raw) as StoreShape;
  } catch {
    const empty: StoreShape = { jobs: [] };
    await fs.writeFile(DATA_FILE(), JSON.stringify(empty, null, 2));
    return empty;
  }
}

async function writeLocal(store: StoreShape) {
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(DATA_FILE(), JSON.stringify(store, null, 2));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function toRecord(row: {
  id: string;
  documentId: string;
  userId: string;
  vectorNs: string;
  filename: string;
  fileUrl: string;
  fileType: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): IngestJobRecord {
  return {
    id: row.id,
    documentId: row.documentId,
    userId: row.userId,
    vectorNs: row.vectorNs,
    filename: row.filename,
    fileUrl: row.fileUrl,
    fileType: row.fileType,
    status: row.status as IngestJobRecord["status"],
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    lastError: row.lastError,
    startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function enqueueIngestJob(
  input: EnqueueIngestInput,
): Promise<IngestJobRecord> {
  const maxAttempts = input.maxAttempts ?? 3;
  const now = new Date();

  if (useDurableDb()) {
    const row = await prisma.ingestJob.create({
      data: {
        documentId: input.documentId,
        userId: input.userId,
        vectorNs: input.vectorNs,
        filename: input.filename,
        fileUrl: input.fileUrl,
        fileType: input.fileType,
        status: "pending",
        attempts: 0,
        maxAttempts,
        updatedAt: now,
      },
    });
    return toRecord(row);
  }

  const store = await ensureLocal();
  const job: IngestJobRecord = {
    id: randomUUID(),
    documentId: input.documentId,
    userId: input.userId,
    vectorNs: input.vectorNs,
    filename: input.filename,
    fileUrl: input.fileUrl,
    fileType: input.fileType,
    status: "pending",
    attempts: 0,
    maxAttempts,
    lastError: null,
    startedAt: null,
    finishedAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  store.jobs.unshift(job);
  await writeLocal(store);
  return job;
}

async function getJob(jobId: string): Promise<IngestJobRecord | null> {
  if (useDurableDb()) {
    const row = await prisma.ingestJob.findUnique({ where: { id: jobId } });
    return row ? toRecord(row) : null;
  }
  const store = await ensureLocal();
  return store.jobs.find((j) => j.id === jobId) ?? null;
}

async function saveJob(job: IngestJobRecord): Promise<void> {
  if (useDurableDb()) {
    await prisma.ingestJob.update({
      where: { id: job.id },
      data: {
        status: job.status,
        attempts: job.attempts,
        lastError: job.lastError,
        startedAt: job.startedAt ? new Date(job.startedAt) : null,
        finishedAt: job.finishedAt ? new Date(job.finishedAt) : null,
        updatedAt: new Date(),
      },
    });
    return;
  }
  const store = await ensureLocal();
  const idx = store.jobs.findIndex((j) => j.id === job.id);
  if (idx === -1) store.jobs.unshift(job);
  else store.jobs[idx] = job;
  await writeLocal(store);
}

async function markDocumentReady(
  job: IngestJobRecord,
  result: {
    pageCount: number;
    chunkCount: number;
    intelligence: {
      summary: string;
      keyTopics: string[];
      suggestedQuestions: string[];
    } | null;
  },
) {
  const patch = {
    status: "ready" as const,
    pageCount: result.pageCount,
    chunkCount: result.chunkCount,
    summary: result.intelligence?.summary ?? null,
    keyTopics: result.intelligence?.keyTopics ?? null,
    suggestedQuestions: result.intelligence?.suggestedQuestions ?? null,
  };

  let ready = await updateDocument(job.documentId, job.userId, patch);
  if (!ready && useDurableDb()) {
    try {
      const row = await prisma.document.update({
        where: { id: job.documentId },
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
        id: row.id,
        userId: row.userId,
        filename: row.filename,
        fileUrl: row.fileUrl,
        fileType: row.fileType,
        fileSize: row.fileSize,
        pageCount: row.pageCount,
        chunkCount: row.chunkCount,
        pineconeNs: row.pineconeNs,
        status: row.status as "ready",
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
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    } catch (e) {
      console.error("direct ready status update failed", e);
    }
  }
  return ready;
}

/**
 * Process one ingest job with exponential backoff retries (same invocation).
 */
export async function processIngestJob(jobId: string): Promise<IngestJobRecord> {
  let job = await getJob(jobId);
  if (!job) throw new Error("Ingest job not found");

  if (job.status === "succeeded") return job;

  // Claim pending/failed → running. Stale running (>10m) can be reclaimed.
  if (useDurableDb()) {
    const staleBefore = new Date(Date.now() - 10 * 60 * 1000);
    const claimed = await prisma.ingestJob.updateMany({
      where: {
        id: jobId,
        OR: [
          { status: { in: ["pending", "failed"] } },
          { status: "running", startedAt: { lt: staleBefore } },
          { status: "running", startedAt: null },
        ],
      },
      data: {
        status: "running",
        startedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    if (claimed.count === 0) {
      return (await getJob(jobId))!;
    }
    job = (await getJob(jobId))!;
    if (job.status === "succeeded") return job;
  } else {
    if (job.status === "running" && job.startedAt) {
      const age = Date.now() - new Date(job.startedAt).getTime();
      if (age < 10 * 60 * 1000) return job;
    }
    job.status = "running";
    job.startedAt = new Date().toISOString();
    job.updatedAt = new Date().toISOString();
    await saveJob(job);
  }

  let lastError = job.lastError;

  while (job.attempts < job.maxAttempts) {
    job.attempts += 1;
    job.updatedAt = new Date().toISOString();
    await saveJob(job);

    const attemptStarted = Date.now();
    try {
      logEvent("ingest.job.attempt", {
        jobId: job.id,
        documentId: job.documentId,
        attempt: job.attempts,
        maxAttempts: job.maxAttempts,
        fileType: job.fileType,
      });

      const result = await ingestDocument({
        userId: job.vectorNs,
        docId: job.documentId,
        filename: job.filename,
        fileUrl: job.fileUrl,
        fileType: job.fileType,
      });

      await markDocumentReady(job, result);

      job.status = "succeeded";
      job.lastError = null;
      job.finishedAt = new Date().toISOString();
      job.updatedAt = new Date().toISOString();
      await saveJob(job);

      logEvent("ingest.complete", {
        jobId: job.id,
        userId: job.userId,
        docId: job.documentId,
        fileType: job.fileType,
        pageCount: result.pageCount,
        chunkCount: result.chunkCount,
        attempts: job.attempts,
        ms: Date.now() - attemptStarted,
      });

      return job;
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Ingest failed";
      job.lastError = lastError;
      job.updatedAt = new Date().toISOString();
      await saveJob(job);

      logEvent("ingest.job.retry", {
        level: "warn",
        jobId: job.id,
        documentId: job.documentId,
        attempt: job.attempts,
        maxAttempts: job.maxAttempts,
        error: lastError,
        ms: Date.now() - attemptStarted,
      });

      if (job.attempts < job.maxAttempts) {
        const backoffMs = Math.min(8000, 1000 * 2 ** (job.attempts - 1));
        await sleep(backoffMs);
      }
    }
  }

  job.status = "failed";
  job.lastError = lastError;
  job.finishedAt = new Date().toISOString();
  job.updatedAt = new Date().toISOString();
  await saveJob(job);

  await updateDocument(job.documentId, job.userId, { status: "failed" });

  logEvent("ingest.failed", {
    level: "error",
    jobId: job.id,
    userId: job.userId,
    docId: job.documentId,
    attempts: job.attempts,
    error: lastError,
  });

  return job;
}

/** Enqueue + schedule background processing. */
export async function enqueueAndSchedule(
  input: EnqueueIngestInput,
): Promise<IngestJobRecord> {
  const job = await enqueueIngestJob(input);
  runInBackground(
    processIngestJob(job.id).catch((e) => {
      console.error("processIngestJob failed", job.id, e);
    }),
  );
  return job;
}

export async function getIngestJob(
  jobId: string,
): Promise<IngestJobRecord | null> {
  return getJob(jobId);
}

export async function getLatestJobForDocument(
  documentId: string,
): Promise<IngestJobRecord | null> {
  if (useDurableDb()) {
    const row = await prisma.ingestJob.findFirst({
      where: { documentId },
      orderBy: { createdAt: "desc" },
    });
    return row ? toRecord(row) : null;
  }
  const store = await ensureLocal();
  return (
    store.jobs
      .filter((j) => j.documentId === documentId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0] ?? null
  );
}
