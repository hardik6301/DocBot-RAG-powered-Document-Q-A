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

/**
 * Resolve current app user.
 * Fast path: read existing Prisma row (no upsert) on every request.
 */
export async function requireUser(): Promise<AppUser | null> {
  if (!isSupabaseConfigured()) {
    const { getLocalSettings } = await import("@/lib/settings");
    const settings = await getLocalSettings();
    return { ...LOCAL_DEV_USER, isPro: withAccess(settings.isPro) };
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser?.email) return null;

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
        // Fire-and-forget style: update without blocking the response path
        // only when something actually changed — still awaited but rare.
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
  } catch (e) {
    console.error("requireUser failed", e);
    return null;
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
