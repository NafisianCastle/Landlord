"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";

export async function updateAppSettings(_prevState: unknown, formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");

  const t = await getTranslations("AdminSettingsActions");
  const lifetimePriceBdt = Number(formData.get("lifetimePriceBdt"));
  const trialDays = Number(formData.get("trialDays"));

  if (!lifetimePriceBdt || lifetimePriceBdt <= 0) return { error: t("priceRequired") };
  if (!trialDays || trialDays <= 0) return { error: t("trialDaysRequired") };

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from("app_settings")
    .update({
      lifetime_price_bdt: lifetimePriceBdt,
      trial_days: trialDays,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  revalidatePath("/paywall");
  return { success: true };
}

export async function createCoupon(_prevState: unknown, formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");

  const t = await getTranslations("AdminCouponsActions");
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

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.from("referral_coupons").insert({
    code,
    discount_type: discountType,
    discount_value: discountValue,
    max_redemptions: maxRedemptions,
    expires_at: expiresAt,
    created_by: admin.id,
  });

  if (error) {
    return { error: error.code === "23505" ? t("codeAlreadyExists") : error.message };
  }

  revalidatePath("/admin/coupons");
  return { success: true };
}

export async function toggleCoupon(couponId: string, active: boolean) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from("referral_coupons")
    .update({ active })
    .eq("id", couponId);
  if (error) return { error: error.message };

  revalidatePath("/admin/coupons");
  return { success: true };
}

export async function grantLifetimeAccess(userId: string) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.from("subscriptions").upsert(
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

  revalidatePath("/admin/users");
  return { success: true };
}
