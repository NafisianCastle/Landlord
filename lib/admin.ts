import { createClient } from "@/lib/supabase/server";

// Server actions are directly invocable and don't run app/admin/layout.tsx's
// gate, so mutations must re-check is_admin here too — mirrors
// getUserWithAccess's rationale in lib/access.ts.
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return null;
  return user;
}
