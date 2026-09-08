/**
 * Simple in-memory sliding-window rate limiter (per server instance).
 * Good enough for single-region Vercel functions / local Node — not a global store.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

/** Opportunistic cleanup so the map does not grow forever. */
function maybePrune(now: number) {
  if (buckets.size < 500) return;
  for (const [key, b] of Array.from(buckets.entries())) {
    if (now >= b.resetAt) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  maybePrune(now);

  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, limit, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      limit,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSec: 0,
  };
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    ...(result.ok
      ? {}
      : { "Retry-After": String(result.retryAfterSec) }),
  };
}

/** Defaults tuned for DocBot demo traffic. */
export const RATE = {
  upload: { limit: 20, windowMs: 60 * 60 * 1000 }, // 20 uploads / hour / user
  chat: { limit: 60, windowMs: 60 * 1000 }, // 60 chats / minute / user
} as const;
