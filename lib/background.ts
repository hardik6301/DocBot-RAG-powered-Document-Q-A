/** Run work after the HTTP response (Vercel waitUntil) or fire-and-forget locally. */

export function runInBackground(task: Promise<unknown>): void {
  try {
    // Lazy require so local builds don't hard-fail if the package is missing.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@vercel/functions") as {
      waitUntil?: (p: Promise<unknown>) => void;
    };
    if (typeof mod.waitUntil === "function") {
      mod.waitUntil(task);
      return;
    }
  } catch {
    // fall through
  }

  void task.catch((e) => {
    console.error("background task failed", e);
  });
}
