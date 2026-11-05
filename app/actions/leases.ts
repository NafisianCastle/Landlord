"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithAccess } from "@/lib/access";
import { validateLease, validateForm, money } from "@/lib/validation/forms";

export type LeaseSubjectType = "plot" | "apartment";

function subjectPath(subjectType: LeaseSubjectType, subjectId: string) {
  return subjectType === "plot" ? `/plots/${subjectId}` : `/apartments/${subjectId}`;
}

/**
 * Tenant details arrive either plaintext or — when the client has encryption
 * unlocked — as one AES-GCM blob (see LeaseForm). Whichever mode is used, the
 * other representation is cleared so a stale plaintext copy can't linger.
 */
function tenantFieldsFromForm(formData: FormData) {
  const encryptedHex = formData.get("sensitiveEncryptedHex");
  const ivHex = formData.get("sensitiveIvHex");
  if (typeof encryptedHex === "string" && typeof ivHex === "string" && encryptedHex && ivHex) {
    return {
      sensitive_encrypted: encryptedHex,
      sensitive_iv: ivHex,
      tenant_name: null,
      tenant_phone: null,
      tenant_email: null,
      notes: null,
    };
  }
  const tenantEmail = String(formData.get("tenantEmail") ?? "").trim().toLowerCase();
  return {
    sensitive_encrypted: null,
    sensitive_iv: null,
    tenant_name: String(formData.get("tenantName") ?? "").trim(),
    tenant_phone: String(formData.get("tenantPhone") ?? "") || null,
    tenant_email: tenantEmail || null,
    notes: String(formData.get("notes") ?? "") || null,
  };
}

function leaseFieldsFromForm(formData: FormData) {
  return {
    ...tenantFieldsFromForm(formData),
    rent_amount: Number(formData.get("rentAmount") ?? 0),
    frequency: String(formData.get("frequency") ?? "monthly"),
    start_date: String(formData.get("startDate") ?? "") || null,
    end_date: String(formData.get("endDate") ?? "") || null,
  };
}

/** Required tenant fields can only be checked here when they aren't encrypted (the form checks them first). */
function missingTenantField(fields: ReturnType<typeof leaseFieldsFromForm>, subjectType: LeaseSubjectType) {
  if (fields.sensitive_encrypted) return null;
  if (!fields.tenant_name) return "tenantNameRequired" as const;
  if (subjectType === "apartment" && !fields.tenant_email) return "tenantEmailRequired" as const;
  return null;
}

export async function createLease(
  subjectType: LeaseSubjectType,
  subjectId: string,
  _prevState: unknown,
  formData: FormData,
) {
  if (subjectType !== "plot" && subjectType !== "apartment") return { error: "Invalid property type." };
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");
  if (!auth.hasAccess) redirect("/paywall");
  const { user } = auth;

  const t = await getTranslations("LeaseActions");

  const validationError = validateLease(formData);
  if (validationError) return { error: validationError };

  const fields = leaseFieldsFromForm(formData);
  const missing = missingTenantField(fields, subjectType);
  if (missing) return { error: t(missing) };
  if (!fields.rent_amount || fields.rent_amount <= 0) return { error: t("rentAmountRequired") };
  if (!fields.start_date) return { error: t("startDateRequired") };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leases")
    .insert({
      user_id: user.id,
      plot_id: subjectType === "plot" ? subjectId : null,
      apartment_id: subjectType === "apartment" ? subjectId : null,
      ...fields,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const { error: rpcError } = await supabase.rpc("ensure_lease_payments", {
    p_lease_id: data.id,
  });
  if (rpcError) console.error("ensure_lease_payments failed:", rpcError.message);

  revalidatePath(subjectPath(subjectType, subjectId));
  return { success: true };
}

export async function updateLease(
  leaseId: string,
  subjectType: LeaseSubjectType,
  subjectId: string,
  _prevState: unknown,
  formData: FormData,
) {
  if (subjectType !== "plot" && subjectType !== "apartment") return { error: "Invalid property type." };
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");
  const t = await getTranslations("LeaseActions");
  if (!auth.hasAccess) return { error: t("trialEnded") };

  const validationError = validateLease(formData);
  if (validationError) return { error: validationError };

  const fields = leaseFieldsFromForm(formData);
  const missing = missingTenantField(fields, subjectType);
  if (missing) return { error: t(missing) };
  if (!fields.rent_amount || fields.rent_amount <= 0) return { error: t("rentAmountRequired") };
  if (!fields.start_date) return { error: t("startDateRequired") };

  const supabase = await createClient();
  const { error } = await supabase.from("leases").update(fields).eq("id", leaseId);
  if (error) return { error: error.message };

  const { error: rpcError } = await supabase.rpc("ensure_lease_payments", {
    p_lease_id: leaseId,
  });
  if (rpcError) console.error("ensure_lease_payments failed:", rpcError.message);

  revalidatePath(subjectPath(subjectType, subjectId));
  return { success: true };
}

export async function endLease(
  leaseId: string,
  subjectType: LeaseSubjectType,
  subjectId: string,
) {
  if (subjectType !== "plot" && subjectType !== "apartment") return { error: "Invalid property type." };
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");

  const supabase = await createClient();
  const { data: lease } = await supabase
    .from("leases")
    .select("end_date")
    .eq("id", leaseId)
    .single();

  const { error } = await supabase
    .from("leases")
    .update({ status: "ended", end_date: lease?.end_date ?? new Date().toISOString().slice(0, 10) })
    .eq("id", leaseId);
  if (error) return { error: error.message };

  revalidatePath(subjectPath(subjectType, subjectId));
  return { success: true };
}

export async function renewLease(
  leaseId: string,
  subjectType: LeaseSubjectType,
  subjectId: string,
  _prevState: unknown,
  formData: FormData,
) {
  if (subjectType !== "plot" && subjectType !== "apartment") return { error: "Invalid property type." };
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");
  const t = await getTranslations("LeaseActions");
  if (!auth.hasAccess) return { error: t("trialEnded") };

  const validationError = validateForm(formData, { newEndDate: { kind: "date", max: 10 } });
  if (validationError) return { error: validationError };

  const newEndDate = String(formData.get("newEndDate") ?? "") || null;
  if (!newEndDate) return { error: t("newEndDateRequired") };

  const supabase = await createClient();
  const { error } = await supabase
    .from("leases")
    .update({ status: "active", end_date: newEndDate, expiry_reminder_sent_at: null })
    .eq("id", leaseId);
  if (error) return { error: error.message };

  const { error: rpcError } = await supabase.rpc("ensure_lease_payments", {
    p_lease_id: leaseId,
  });
  if (rpcError) console.error("ensure_lease_payments failed:", rpcError.message);

  revalidatePath(subjectPath(subjectType, subjectId));
  revalidatePath("/dashboard");
  revalidatePath("/leases");
  return { success: true };
}

export async function deleteLease(
  leaseId: string,
  subjectType: LeaseSubjectType,
  subjectId: string,
) {
  if (subjectType !== "plot" && subjectType !== "apartment") return { error: "Invalid property type." };
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");
  if (!auth.hasAccess) redirect("/paywall");

  const supabase = await createClient();
  const t = await getTranslations("LeaseActions");
  const { data: lease, error: leaseError } = await supabase
    .from("leases")
    .select("id, apartment_id, tenant_email, sensitive_encrypted, start_date, end_date")
    .eq("id", leaseId)
    .maybeSingle();
  if (leaseError) return { error: leaseError.message };
  if (!lease) return { error: t("historyCannotDelete") };

  const paidResult = await supabase
    .from("lease_payments")
    .select("id", { count: "exact", head: true })
    .eq("lease_id", leaseId)
    .eq("paid", true);
  if (paidResult.error) return { error: paidResult.error.message };

  let hasBills = false;
  // An encrypted lease's email can't be read here, so any bill dated within
  // it counts (an apartment has one tenant at a time).
  if (lease.apartment_id && (lease.tenant_email || lease.sensitive_encrypted)) {
    const billResult = await supabase
      .from("apartment_bills")
      .select("tenant_email, due_date")
      .eq("apartment_id", lease.apartment_id)
      .gte("due_date", lease.start_date)
      .lte("due_date", lease.end_date ?? "9999-12-31");
    if (billResult.error) return { error: billResult.error.message };
    const email = lease.tenant_email?.trim().toLowerCase();
    hasBills = (billResult.data ?? []).some((bill) => !email || bill.tenant_email.trim().toLowerCase() === email);
  }

  if ((paidResult.count ?? 0) > 0 || hasBills) return { error: t("historyCannotDelete") };
  const { error } = await supabase.from("leases").delete().eq("id", leaseId);
  if (error) return { error: error.message };

  revalidatePath(subjectPath(subjectType, subjectId));
  return { success: true };
}

export async function recordPayment(
  paymentId: string,
  subjectType: LeaseSubjectType,
  subjectId: string,
  _prevState: unknown,
  formData: FormData,
) {
  if (subjectType !== "plot" && subjectType !== "apartment") return { error: "Invalid property type." };
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");
  const t = await getTranslations("LeaseActions");
  if (!auth.hasAccess) return { error: t("trialEnded") };

  const validationError = validateForm(formData, { paidAmount: money, paidDate: { kind: "date", max: 10 } });
  if (validationError) return { error: validationError };

  const paidAmount = formData.get("paidAmount") ? Number(formData.get("paidAmount")) : null;
  const paidDate = String(formData.get("paidDate") ?? "") || new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const { error } = await supabase
    .from("lease_payments")
    .update({ paid: true, paid_date: paidDate, paid_amount: paidAmount })
    .eq("id", paymentId);
  if (error) return { error: error.message };

  revalidatePath(subjectPath(subjectType, subjectId));
  revalidatePath("/dashboard");
  revalidatePath("/leases");
  return { success: true };
}

export async function unmarkPayment(
  paymentId: string,
  subjectType: LeaseSubjectType,
  subjectId: string,
) {
  if (subjectType !== "plot" && subjectType !== "apartment") return { error: "Invalid property type." };
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");

  const supabase = await createClient();
  const { error } = await supabase
    .from("lease_payments")
    .update({ paid: false, paid_date: null, paid_amount: null })
    .eq("id", paymentId);
  if (error) return { error: error.message };

  revalidatePath(subjectPath(subjectType, subjectId));
  revalidatePath("/dashboard");
  revalidatePath("/leases");
  return { success: true };
}

export async function ensureLeasePayments(leaseId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("ensure_lease_payments", { p_lease_id: leaseId });
  if (error) console.error("ensure_lease_payments failed:", error.message);
}
