import type { SupabaseClient } from "@supabase/supabase-js";

/** The live demo is offered only when switched on and fully configured. */
export function demoEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEMO_LOGIN_ENABLED === "true" &&
    Boolean(process.env.DEMO_USER_EMAIL) &&
    Boolean(process.env.DEMO_USER_PASSWORD)
  );
}

/** Same wording as the database's block_demo_writes trigger. */
export const DEMO_READ_ONLY = "The demo is read-only. Create a free account to save changes.";

/**
 * Whether userId is the shared, read-only demo account. profiles.is_demo is
 * the source of truth (set by lib/demoSeed.mjs, locked for API callers).
 * Works with the user's own client (RLS: own profile) or the service role.
 */
export async function isDemoAccount(client: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await client.from("profiles").select("is_demo").eq("id", userId).maybeSingle();
  return data?.is_demo === true;
}
