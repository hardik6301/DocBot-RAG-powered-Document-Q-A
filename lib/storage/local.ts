import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { isVercelRuntime, uploadRoot } from "@/lib/paths";

/** Save uploaded file (local public/uploads or Vercel /tmp). */
export async function saveLocalFile(
  userId: string,
  file: File,
): Promise<{ fileUrl: string; absPath: string; size: number }> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${randomUUID()}-${safeName}`;
  const root = uploadRoot();
  const dir = path.join(root, userId);
  await fs.mkdir(dir, { recursive: true });
  const absPath = path.join(dir, key);
  await fs.writeFile(absPath, bytes);

  const fileUrl = isVercelRuntime()
    ? `tmp://${userId}/${key}`
    : `/uploads/${userId}/${key}`;

  return { fileUrl, absPath, size: bytes.length };
}

export function resolveUploadPath(fileUrl: string) {
  if (fileUrl.startsWith("tmp://")) {
    return path.join(uploadRoot(), fileUrl.replace("tmp://", ""));
  }
  if (fileUrl.startsWith("/uploads/")) {
    return path.join(process.cwd(), "public", fileUrl.replace(/^\//, ""));
  }
  return fileUrl;
}

export async function deleteLocalFile(fileUrl: string) {
  if (!fileUrl.startsWith("/uploads/") && !fileUrl.startsWith("tmp://")) return;
  const absPath = resolveUploadPath(fileUrl);
  try {
    await fs.unlink(absPath);
  } catch {
    // ignore missing file
  }
}
