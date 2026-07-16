import os from "os";
import path from "path";

/** Local project dirs vs ephemeral Vercel /tmp */
export function dataDir() {
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "docbot-data");
  }
  return path.join(process.cwd(), ".data");
}

export function uploadRoot() {
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "docbot-uploads");
  }
  return path.join(process.cwd(), "public", "uploads");
}

export function isVercelRuntime() {
  return Boolean(process.env.VERCEL);
}
