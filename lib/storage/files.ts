import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { isStorageConfigured, storageBucket } from "@/lib/config";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  deleteLocalFile,
  resolveUploadPath,
  saveLocalFile,
} from "@/lib/storage/local";

const SUPABASE_PREFIX = "supabase://";

export function isSupabaseFileUrl(fileUrl: string) {
  return fileUrl.startsWith(SUPABASE_PREFIX);
}

function parseSupabaseUrl(fileUrl: string): { bucket: string; objectPath: string } {
  // supabase://bucket/userId/key
  const rest = fileUrl.slice(SUPABASE_PREFIX.length);
  const slash = rest.indexOf("/");
  if (slash < 0) throw new Error(`Invalid supabase file URL: ${fileUrl}`);
  return {
    bucket: rest.slice(0, slash),
    objectPath: rest.slice(slash + 1),
  };
}

export async function saveUploadFile(
  userId: string,
  file: File,
): Promise<{ fileUrl: string; absPath: string | null; size: number }> {
  const bytes = Buffer.from(await file.arrayBuffer());
  return saveUploadBytes(userId, {
    filename: file.name,
    bytes,
    contentType: file.type || "application/octet-stream",
  });
}

export async function saveUploadBytes(
  userId: string,
  opts: { filename: string; bytes: Buffer; contentType?: string },
): Promise<{ fileUrl: string; absPath: string | null; size: number }> {
  const { filename, bytes, contentType = "application/octet-stream" } = opts;

  if (!isStorageConfigured()) {
    const file = new File([new Uint8Array(bytes)], filename, {
      type: contentType,
    });
    const local = await saveLocalFile(userId, file);
    return { fileUrl: local.fileUrl, absPath: local.absPath, size: local.size };
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${userId}/${randomUUID()}-${safeName}`;
  const bucket = storageBucket();
  const supabase = createServiceClient();

  const { error } = await supabase.storage.from(bucket).upload(key, bytes, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return {
    fileUrl: `${SUPABASE_PREFIX}${bucket}/${key}`,
    absPath: null,
    size: bytes.length,
  };
}

export async function deleteUploadFile(fileUrl: string) {
  if (isSupabaseFileUrl(fileUrl)) {
    if (!isStorageConfigured()) return;
    const { bucket, objectPath } = parseSupabaseUrl(fileUrl);
    const supabase = createServiceClient();
    await supabase.storage.from(bucket).remove([objectPath]);
    return;
  }
  await deleteLocalFile(fileUrl);
}

/**
 * Ensure a local filesystem path exists for ingest parsers.
 * Downloads from Supabase Storage into a temp file when needed.
 */
export async function materializeForIngest(fileUrl: string): Promise<{
  absPath: string;
  cleanup: () => Promise<void>;
}> {
  if (!isSupabaseFileUrl(fileUrl)) {
    return {
      absPath: resolveUploadPath(fileUrl),
      cleanup: async () => {},
    };
  }

  const { bucket, objectPath } = parseSupabaseUrl(fileUrl);
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage.from(bucket).download(objectPath);
  if (error || !data) {
    throw new Error(
      `Storage download failed: ${error?.message ?? "no data"}`,
    );
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const tmp = path.join(
    os.tmpdir(),
    `docbot-${randomUUID()}${path.extname(objectPath)}`,
  );
  await fs.writeFile(tmp, buffer);

  return {
    absPath: tmp,
    cleanup: async () => {
      try {
        await fs.unlink(tmp);
      } catch {
        // ignore
      }
    },
  };
}

/** Read upload bytes for authenticated download / preview. */
export async function readUploadBytes(fileUrl: string): Promise<{
  bytes: Buffer;
  contentType: string;
}> {
  if (isSupabaseFileUrl(fileUrl)) {
    if (!isStorageConfigured()) {
      throw new Error("Storage is not configured");
    }
    const { bucket, objectPath } = parseSupabaseUrl(fileUrl);
    const supabase = createServiceClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(objectPath);
    if (error || !data) {
      throw new Error(
        `Storage download failed: ${error?.message ?? "no data"}`,
      );
    }
    const bytes = Buffer.from(await data.arrayBuffer());
    return {
      bytes,
      contentType: guessContentType(objectPath),
    };
  }

  const absPath = resolveUploadPath(fileUrl);
  const bytes = await fs.readFile(absPath);
  return { bytes, contentType: guessContentType(absPath) };
}

function guessContentType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".pptx") || lower.endsWith(".ppt"))
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (lower.endsWith(".docx") || lower.endsWith(".doc"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".epub")) return "application/epub+zip";
  if (lower.endsWith(".md") || lower.endsWith(".markdown"))
    return "text/markdown; charset=utf-8";
  if (lower.endsWith(".txt") || lower.endsWith(".html") || lower.endsWith(".htm"))
    return "text/plain; charset=utf-8";
  return "application/octet-stream";
}
