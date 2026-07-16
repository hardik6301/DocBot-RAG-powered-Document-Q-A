export const FREE_TIER_LIMIT = 3;

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** Neon Prisma persistence for documents/chats/users. */
export function useDurableDb() {
  return isDatabaseConfigured();
}

/** Supabase Storage (service role) for file bytes. */
export function isStorageConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function storageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || "documents";
}

export function isLocalDevMode() {
  return !isSupabaseConfigured();
}
