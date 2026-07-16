import { isDatabaseConfigured, isSupabaseConfigured } from "@/lib/config";
import { LOCAL_DEV_USER, type AppUser } from "@/types";

/**
 * Resolve current app user.
 * Local mode (no Supabase): fixed dev user + local settings.json isPro.
 * Supabase + Neon: session user upserted in Prisma.
 */
export async function requireUser(): Promise<AppUser | null> {
  if (!isSupabaseConfigured()) {
    const { getLocalSettings } = await import("@/lib/settings");
    const settings = await getLocalSettings();
    return { ...LOCAL_DEV_USER, isPro: settings.isPro };
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
        isPro: settings.isPro,
      };
    }

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
          (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
      },
    });

    return {
      id: user.id,
      supabaseId: user.supabaseId,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      isPro: user.isPro,
    };
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
