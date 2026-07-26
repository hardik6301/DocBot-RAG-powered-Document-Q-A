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

function fromAuthUser(authUser: {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
}, isPro: boolean): AppUser {
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

/**
 * Resolve current app user.
 * Local mode (no Supabase): fixed dev user.
 * Supabase: session user; Prisma upsert when DATABASE_URL works.
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

    const { getLocalSettings } = await import("@/lib/settings");
    const settings = await getLocalSettings();

    if (!isDatabaseConfigured()) {
      return fromAuthUser(
        {
          id: authUser.id,
          email: authUser.email,
          user_metadata: authUser.user_metadata,
        },
        settings.isPro,
      );
    }

    try {
      const prisma = (await import("@/lib/prisma")).default;
      const user = await prisma.user.upsert({
        where: { supabaseId: authUser.id },
        update: {
          email: authUser.email,
          fullName:
            (authUser.user_metadata?.full_name as string | undefined) ??
            (authUser.user_metadata?.name as string | undefined) ??
            undefined,
          avatarUrl:
            (authUser.user_metadata?.avatar_url as string | undefined) ??
            undefined,
        },
        create: {
          supabaseId: authUser.id,
          email: authUser.email,
          fullName:
            (authUser.user_metadata?.full_name as string | undefined) ??
            (authUser.user_metadata?.name as string | undefined) ??
            null,
          avatarUrl:
            (authUser.user_metadata?.avatar_url as string | undefined) ??
            null,
        },
      });

      return {
        id: user.id,
        supabaseId: user.supabaseId,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        isPro: withAccess(user.isPro),
      };
    } catch (dbError) {
      console.error(
        "requireUser: database upsert failed; trying read-only lookup",
        dbError,
      );
      // Prefer existing Prisma user id so documents don't "disappear"
      // when upsert flakes but the row already exists.
      try {
        const prisma = (await import("@/lib/prisma")).default;
        const existing = await prisma.user.findUnique({
          where: { supabaseId: authUser.id },
        });
        if (existing) {
          return {
            id: existing.id,
            supabaseId: existing.supabaseId,
            email: existing.email,
            fullName: existing.fullName,
            avatarUrl: existing.avatarUrl,
            isPro: withAccess(existing.isPro),
          };
        }
      } catch (lookupError) {
        console.error("requireUser: read-only lookup failed", lookupError);
      }
      return fromAuthUser(
        {
          id: authUser.id,
          email: authUser.email,
          user_metadata: authUser.user_metadata,
        },
        settings.isPro,
      );
    }
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
