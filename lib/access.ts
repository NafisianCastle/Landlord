import { createClient } from "@/lib/supabase/server";

/** True during the 14-day trial, or once a completed lifetime subscription exists. */
export async function hasActiveAccess(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from("profiles").select("trial_ends_at").eq("id", userId).single(),
    supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .eq("status", "completed")
      .maybeSingle(),
  ]);

  if (subscription) return true;
  if (profile && new Date(profile.trial_ends_at) > new Date()) return true;
  return false;
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
