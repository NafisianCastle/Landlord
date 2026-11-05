import { createAdminClient } from "@/lib/supabase/admin";

// Admin reads shared by the /admin pages and the /api/admin routes the
// mobile app calls. Callers must have checked is_admin first: these use the
// service-role client.

export async function getAdminOverview() {
  const admin = createAdminClient();
  const [
    { count: totalUsers },
    { count: activeTrials },
    { count: paidUsers },
    { data: completedPayments },
    { count: referredSignups },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gt("trial_ends_at", new Date().toISOString()),
    admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "completed"),
    admin.from("payment_transactions").select("amount").eq("status", "completed"),
    admin.from("profiles").select("id", { count: "exact", head: true }).not("referred_by", "is", null),
  ]);
  return {
    totalUsers: totalUsers ?? 0,
    activeTrials: activeTrials ?? 0,
    paidUsers: paidUsers ?? 0,
    revenue: (completedPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0),
    referredSignups: referredSignups ?? 0,
  };
}

export type AdminUserStatus = "paid" | "trialActive" | "trialExpired";

export async function getAdminUsers(q?: string) {
  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select("id, email, full_name, trial_ends_at, is_admin")
    .order("created_at", { ascending: false })
    .limit(50);
  if (q) query = query.ilike("email", `%${q}%`);

  const { data: profiles } = await query;
  const userIds = (profiles ?? []).map((p) => p.id);
  const { data: subscriptions } = await admin
    .from("subscriptions")
    .select("user_id, status")
    .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const paidUserIds = new Set(
    (subscriptions ?? []).filter((s) => s.status === "completed").map((s) => s.user_id),
  );
  return (profiles ?? []).map((p) => ({
    id: p.id as string,
    email: p.email as string | null,
    fullName: p.full_name as string | null,
    isAdmin: Boolean(p.is_admin),
    status: (paidUserIds.has(p.id)
      ? "paid"
      : new Date(p.trial_ends_at) > new Date()
        ? "trialActive"
        : "trialExpired") as AdminUserStatus,
  }));
}

export async function getAdminCoupons() {
  const admin = createAdminClient();
  const { data: coupons } = await admin
    .from("referral_coupons")
    .select("id, code, discount_type, discount_value, active, max_redemptions, times_redeemed, expires_at")
    .order("created_at", { ascending: false });
  return (coupons ?? []).map((c) => ({
    id: c.id as string,
    code: c.code as string,
    discountType: c.discount_type as "percent" | "fixed",
    discountValue: c.discount_value as number,
    active: c.active as boolean,
    maxRedemptions: c.max_redemptions as number | null,
    timesRedeemed: c.times_redeemed as number,
    expiresAt: c.expires_at as string | null,
  }));
}
