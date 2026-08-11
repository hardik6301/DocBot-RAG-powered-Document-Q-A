import {
  BILLING_ENABLED,
  isDatabaseConfigured,
  isSupabaseConfigured,
} from "@/lib/config";
import { LOCAL_DEV_USER, type AppUser } from "@/types";

/** Full access while billing is off; otherwise use stored Pro flag. */
function withAccess(isPro: boolean): boolean {
  return BILLING_ENABLED ? isPro : true;
}

function fromAuthUser(
  authUser: {
    id: string;
    email: string;
    user_metadata?: Record<string, unknown>;
  },
  isPro: boolean,
): AppUser {
  return {
    id: authUser.id,
    supabaseId: authUser.id,
    email: authUser.email,
    fullName:
      (authUser.user_metadata?.full_name as string | undefined) ??
      (authUser.user_metadata?.name as string | undefined) ??
      null,
    avatarUrl:
      (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
    isPro: withAccess(isPro),
  };
}

function toAppUser(user: {
  id: string;
  supabaseId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isPro: boolean;
}): AppUser {
  return {
    id: user.id,
    supabaseId: user.supabaseId,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    isPro: withAccess(user.isPro),
  };
}

function assertUsableDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  if (!url) return;
  // On Vercel, localhost/Docker URLs always fail and used to surface as fake 401s.
  if (
    process.env.VERCEL &&
    /(@|\/\/)(127\.0\.0\.1|localhost)([:/]|$)/i.test(url)
  ) {
    throw new Error(
      "DATABASE_URL points to localhost on Vercel. Set it to your cloud Postgres (Neon or Supabase pooler), then redeploy.",
    );
  }
}

/**
 * Resolve current app user.
 * Fast path: read existing Prisma row (no upsert) on every request.
 *
 * Returns null only when there is no valid Supabase session.
 * Database failures throw (callers should return 503, not 401).
 */
export async function requireUser(): Promise<AppUser | null> {
  if (!isSupabaseConfigured()) {
    const { getLocalSettings } = await import("@/lib/settings");
    const settings = await getLocalSettings();
    return { ...LOCAL_DEV_USER, isPro: withAccess(settings.isPro) };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser?.email) return null;

  if (!isDatabaseConfigured()) {
    const { getLocalSettings } = await import("@/lib/settings");
    const settings = await getLocalSettings();
    return fromAuthUser(
      {
        id: authUser.id,
        email: authUser.email,
        user_metadata: authUser.user_metadata,
      },
      settings.isPro,
    );
  }

  assertUsableDatabaseUrl();

  const prisma = (await import("@/lib/prisma")).default;
  const fullName =
    (authUser.user_metadata?.full_name as string | undefined) ??
    (authUser.user_metadata?.name as string | undefined) ??
    null;
  const avatarUrl =
    (authUser.user_metadata?.avatar_url as string | undefined) ?? null;

  // Hot path: findUnique is much cheaper than upsert on every API call.
  const existing = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
  });

  if (existing) {
    const needsSync =
      existing.email !== authUser.email ||
      (fullName && existing.fullName !== fullName) ||
      (avatarUrl && existing.avatarUrl !== avatarUrl);

    if (needsSync) {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          email: authUser.email,
          ...(fullName ? { fullName } : {}),
          ...(avatarUrl ? { avatarUrl } : {}),
        },
      });
      return toAppUser(updated);
    }

    return toAppUser(existing);
  }

  const created = await prisma.user.create({
    data: {
      supabaseId: authUser.id,
      email: authUser.email,
      fullName,
      avatarUrl,
    },
  });
  return toAppUser(created);
}

/** Map requireUser failures to the right HTTP response (401 vs 503). */
export function userAuthErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Server error";
  const looksLikeDb =
    /database|prisma|p1001|p1000|can't reach|econnrefused|127\.0\.0\.1|localhost|DATABASE_URL/i.test(
      message,
    );
  if (looksLikeDb) {
    return Response.json(
      {
        error: "Database unavailable",
        hint: "On Vercel, DATABASE_URL must be cloud Postgres (Neon/Supabase), not 127.0.0.1. Check Vercel env vars and redeploy.",
        detail: message,
      },
      { status: 503 },
    );
  }
  console.error("requireUser unexpected error", error);
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

/** Session missing → 401; DB misconfigured → 503. */
export async function requireUserOrResponse(): Promise<AppUser | Response> {
  try {
    const user = await requireUser();
    if (!user) {
      return Response.json(
        {
          error: "Unauthorized",
          hint: "Sign in again. If this persists on Vercel, check Supabase env vars and redirect URLs.",
        },
        { status: 401 },
      );
    }
    return user;
  } catch (e) {
    return userAuthErrorResponse(e);
  }
}

export async function getSessionUser() {
  if (!isSupabaseConfigured()) {
    return { id: LOCAL_DEV_USER.supabaseId, email: LOCAL_DEV_USER.email };
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
