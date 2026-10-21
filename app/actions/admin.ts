"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import {
  createCouponOp,
  grantLifetimeAccessOp,
  toggleCouponOp,
  updateAppSettingsOp,
} from "@/lib/adminOps";

// The logic lives in lib/adminOps.ts so /api/admin (the mobile app) shares it.

export async function updateAppSettings(_prevState: unknown, formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");

  const result = await updateAppSettingsOp(formData);
  if (result.success) {
    revalidatePath("/admin/settings");
    revalidatePath("/paywall");
  }
  return result;
}

export async function createCoupon(_prevState: unknown, formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");

  const result = await createCouponOp(admin.id, formData);
  if (result.success) revalidatePath("/admin/coupons");
  return result;
}

export async function toggleCoupon(couponId: string, active: boolean) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");

  const result = await toggleCouponOp(couponId, active);
  if (result.success) revalidatePath("/admin/coupons");
  return result;
}

export async function grantLifetimeAccess(userId: string) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");

  const result = await grantLifetimeAccessOp(userId);
  if (result.success) revalidatePath("/admin/users");
  return result;
}
