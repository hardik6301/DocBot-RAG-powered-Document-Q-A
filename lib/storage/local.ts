import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

/** Save uploaded file to local disk (swap for Supabase Storage later). */
export async function saveLocalFile(
  userId: string,
  file: File,
): Promise<{ fileUrl: string; absPath: string; size: number }> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${randomUUID()}-${safeName}`;
  const dir = path.join(UPLOAD_ROOT, userId);
  await fs.mkdir(dir, { recursive: true });
  const absPath = path.join(dir, key);
  await fs.writeFile(absPath, bytes);
  return {
    fileUrl: `/uploads/${userId}/${key}`,
    absPath,
    size: bytes.length,
  };
}

export async function deleteLocalFile(fileUrl: string) {
  if (!fileUrl.startsWith("/uploads/")) return;
  const absPath = path.join(process.cwd(), "public", fileUrl.replace(/^\//, ""));
  try {
    await fs.unlink(absPath);
  } catch {
    // ignore missing file
  }
}
