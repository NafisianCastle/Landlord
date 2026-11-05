import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateForm, money, UUID } from "@/lib/validation/forms";

// Admin writes shared by the server actions in app/actions/admin.ts and the
// /api/admin routes. Not a "use server" module on purpose: every export of
// one is client-callable, and these do no auth. Callers must have checked
// is_admin (requireAdmin / adminFromBearer) first.

export type AdminResult = { error?: string; success?: true };

export async function updateAppSettingsOp(formData: FormData): Promise<AdminResult> {
  const t = await getTranslations("AdminSettingsActions");
  const validationError = validateForm(formData, {
    lifetimePriceBdt: money, trialDays: { kind: "number", min: 1, integer: true, max: 6 },
  });
  if (validationError) return { error: validationError };
  const lifetimePriceBdt = Number(formData.get("lifetimePriceBdt"));
  const trialDays = Number(formData.get("trialDays"));

  if (!lifetimePriceBdt || lifetimePriceBdt <= 0) return { error: t("priceRequired") };
  if (!trialDays || trialDays <= 0) return { error: t("trialDaysRequired") };

  const { error } = await createAdminClient()
    .from("app_settings")
    .update({
      lifetime_price_bdt: lifetimePriceBdt,
      trial_days: trialDays,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return { error: error.message };
  return { success: true };
}

export async function createCouponOp(adminId: string, formData: FormData): Promise<AdminResult> {
  const t = await getTranslations("AdminCouponsActions");
  const validationError = validateForm(formData, {
    code: { max: 64, pattern: /^[a-z0-9_-]+$/i },
    discountType: { choices: ["percent", "fixed"] }, discountValue: money,
    maxRedemptions: { kind: "number", min: 1, integer: true, max: 10 },
    expiresAt: { kind: "date", max: 10 },
  });
  if (validationError) return { error: validationError };
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const discountType = String(formData.get("discountType") ?? "percent");
  const discountValue = Number(formData.get("discountValue"));
  const maxRedemptions = formData.get("maxRedemptions")
    ? Number(formData.get("maxRedemptions"))
    : null;
  const expiresAt = String(formData.get("expiresAt") ?? "") || null;

  if (!code) return { error: t("codeRequired") };
  if (!discountValue || discountValue <= 0) return { error: t("discountValueRequired") };
  if (discountType === "percent" && discountValue > 100) return { error: t("percentTooHigh") };

  const { error } = await createAdminClient().from("referral_coupons").insert({
    code,
    discount_type: discountType,
    discount_value: discountValue,
    max_redemptions: maxRedemptions,
    expires_at: expiresAt,
    created_by: adminId,
  });
  if (error) {
    return { error: error.code === "23505" ? t("codeAlreadyExists") : error.message };
  }
  return { success: true };
}

export async function toggleCouponOp(couponId: unknown, active: unknown): Promise<AdminResult> {
  if (typeof couponId !== "string" || !UUID.test(couponId) || typeof active !== "boolean") {
    return { error: "Invalid coupon." };
  }
  const { error } = await createAdminClient()
    .from("referral_coupons")
    .update({ active })
    .eq("id", couponId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function grantLifetimeAccessOp(userId: unknown): Promise<AdminResult> {
  if (typeof userId !== "string" || !UUID.test(userId)) return { error: "Invalid account ID." };
  const { error } = await createAdminClient().from("subscriptions").upsert(
    {
      user_id: userId,
      plan_type: "lifetime",
      amount_paid: 0,
      currency: "BDT",
      status: "completed",
      paid_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: error.message };
  return { success: true };
}
