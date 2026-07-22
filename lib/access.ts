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
