import { createClient } from "@/lib/supabase/server";

/** App is free — always grants access. Paywall/subscription checks disabled. */
export async function hasActiveAccess(_userId: string): Promise<boolean> {
  return true;
}

/**
 * Server actions are directly invocable and don't run the (protected) layout
 * that gates the paywall in the UI, so mutations must re-check both auth and
 * access here — otherwise a user whose trial expired (and hasn't paid) could
 * keep calling createPlot/uploadDocument/etc. directly. Returns null only
 * when there's no session; access lapse is reported via `hasAccess: false`
 * so callers can redirect to /paywall instead of /login.
 */
export async function getUserWithAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { user, hasAccess: await hasActiveAccess(user.id) };
}
