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
  if (!isStorageConfigured()) {
    const local = await saveLocalFile(userId, file);
    return { fileUrl: local.fileUrl, absPath: local.absPath, size: local.size };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${userId}/${randomUUID()}-${safeName}`;
  const bucket = storageBucket();
  const supabase = createServiceClient();

  const { error } = await supabase.storage.from(bucket).upload(key, bytes, {
    contentType: file.type || "application/octet-stream",
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
