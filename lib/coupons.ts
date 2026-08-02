import { createAdminClient } from "@/lib/supabase/admin";

export interface CouponValidation {
  couponId: string;
  code: string;
  discountAmount: number;
  finalAmount: number;
}

// Called from the payment init routes (trusted server context, already using
// the admin client for the transaction insert) — never exposed to the
// client directly, so there's no RLS policy needed on referral_coupons for
// this lookup.
export async function validateCoupon(
  rawCode: string | null,
  userId: string,
  priceBdt: number,
): Promise<CouponValidation | { error: string }> {
  if (!rawCode) return { error: "No coupon code" };
  const code = rawCode.trim().toUpperCase();
  if (!code) return { error: "No coupon code" };

  const admin = createAdminClient();
  const { data: coupon } = await admin
    .from("referral_coupons")
    .select("id, code, discount_type, discount_value, active, max_redemptions, times_redeemed, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (!coupon || !coupon.active) return { error: "Invalid coupon code" };
  if (coupon.expires_at && coupon.expires_at < new Date().toISOString().slice(0, 10)) {
    return { error: "Coupon expired" };
  }
  if (coupon.max_redemptions != null && coupon.times_redeemed >= coupon.max_redemptions) {
    return { error: "Coupon fully redeemed" };
  }

  const { data: alreadyUsed } = await admin
    .from("coupon_redemptions")
    .select("id")
    .eq("coupon_id", coupon.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (alreadyUsed) return { error: "Coupon already used" };

  const discountAmount =
    coupon.discount_type === "percent"
      ? Math.round((priceBdt * coupon.discount_value) / 100)
      : Math.min(coupon.discount_value, priceBdt);

  return {
    couponId: coupon.id,
    code: coupon.code,
    discountAmount,
    finalAmount: Math.max(priceBdt - discountAmount, 0),
  };
}

// Called from the payment success/callback routes once a transaction is
// confirmed completed — increments the shared counter and records who used
// it, so validateCoupon's per-user reuse check above has something to read.
export async function recordCouponRedemption(couponId: string, userId: string, tranId: string) {
  const admin = createAdminClient();
  await admin.from("coupon_redemptions").insert({ coupon_id: couponId, user_id: userId, tran_id: tranId });
  await admin.rpc("increment_coupon_redemptions", { p_coupon_id: couponId });
}
