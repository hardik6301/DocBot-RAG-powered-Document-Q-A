import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user?.email) {
      if (isDatabaseConfigured()) {
        try {
          const prisma = (await import("@/lib/prisma")).default;
          await prisma.user.upsert({
            where: { supabaseId: data.user.id },
            update: {
              email: data.user.email,
              fullName:
                (data.user.user_metadata?.full_name as string | undefined) ??
                (data.user.user_metadata?.name as string | undefined) ??
                undefined,
              avatarUrl:
                (data.user.user_metadata?.avatar_url as string | undefined) ??
                undefined,
            },
            create: {
              supabaseId: data.user.id,
              email: data.user.email,
              fullName:
                (data.user.user_metadata?.full_name as string | undefined) ??
                (data.user.user_metadata?.name as string | undefined) ??
                null,
              avatarUrl:
                (data.user.user_metadata?.avatar_url as string | undefined) ??
                null,
            },
          });
        } catch (e) {
          console.error("Failed to upsert user after auth callback", e);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth`);
}
