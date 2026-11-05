"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getUserWithAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { UUID, validateForm } from "@/lib/validation/forms";
import { validateBill, validateBillFile } from "@/lib/validation/bills";

function refresh(apartmentId?: string) {
  revalidatePath("/bills");
  revalidatePath("/", "layout");
  if (apartmentId) revalidatePath(`/apartments/${apartmentId}`);
}

export async function createApartmentBill(apartmentId: string, _state: unknown, form: FormData) {
  const t = await getTranslations("Bills");
  const auth = await getUserWithAccess();
  if (!auth?.hasAccess) return { error: t("accessDenied") };
  if (!UUID.test(apartmentId)) return { error: t("notFound") };
  const invalid = validateBill(form);
  if (invalid) return { error: invalid };
  const supabase = await createClient();
  const { data: share } = await supabase.from("apartment_tenants")
    .select("id, invited_email").eq("id", String(form.get("tenantShareId")))
    .eq("apartment_id", apartmentId).eq("owner_id", auth.user.id).single();
  if (!share) return { error: t("notFound") };
  const upload = await validateBillFile(form);
  if ("error" in upload) return { error: t(upload.error!) };
  const id = crypto.randomUUID();
  const { error } = await supabase.from("apartment_bills").insert({
    id, apartment_id: apartmentId, owner_id: auth.user.id, tenant_share_id: share.id,
    tenant_email: share.invited_email, title: String(form.get("title")).trim(),
    amount: Number(form.get("amount")), due_date: String(form.get("dueDate")),
    visible_to_tenant: form.get("visible") === "on",
  });
  if (error) return { error: t("saveFailed") };
  const path = `${id}/bill/${auth.user.id}/${crypto.randomUUID()}.${upload.extension}`;
  const { error: uploadError } = await supabase.storage.from("apartment-bills")
    .upload(path, upload.file, { contentType: upload.file.type, upsert: false });
  if (uploadError) {
    await supabase.from("apartment_bills").delete().eq("id", id);
    return { error: t("uploadFailed") };
  }
  const { data: published, error: publishError } = await supabase.from("apartment_bills")
    .update({ storage_path: path, file_name: upload.file.name }).eq("id", id).select("id").single();
  if (publishError || !published) {
    await supabase.from("apartment_bills").delete().eq("id", id);
    return { error: t("saveFailed") };
  }
  refresh(apartmentId);
  return { success: true };
}

export async function submitBillProof(billId: string, _state: unknown, form: FormData) {
  const t = await getTranslations("Bills");
  const auth = await getUserWithAccess();
  if (!auth?.hasAccess) return { error: t("accessDenied") };
  if (!UUID.test(billId)) return { error: t("notFound") };
  const supabase = await createClient();
  const { data: bill } = await supabase.from("apartment_bills").select("id, apartment_id, paid_at, tenant_share_id")
    .eq("id", billId).single();
  if (!bill || bill.paid_at) return { error: t("notFound") };
  const { data: share } = await supabase.from("apartment_tenants").select("id")
    .eq("id", bill.tenant_share_id).eq("user_id", auth.user.id).single();
  if (!share) return { error: t("accessDenied") };
  const { data: pending } = await supabase.from("apartment_bill_proofs").select("id")
    .eq("bill_id", billId).eq("status", "pending").limit(1);
  if (pending?.length) return { error: t("alreadyPending") };
  const upload = await validateBillFile(form);
  if ("error" in upload) return { error: t(upload.error!) };
  const path = `${billId}/proof/${auth.user.id}/${crypto.randomUUID()}.${upload.extension}`;
  const { error: uploadError } = await supabase.storage.from("apartment-bills")
    .upload(path, upload.file, { contentType: upload.file.type, upsert: false });
  if (uploadError) return { error: t("uploadFailed") };
  const { error } = await supabase.from("apartment_bill_proofs").insert({
    bill_id: billId, user_id: auth.user.id, storage_path: path, file_name: upload.file.name,
  });
  if (error) return { error: error.code === "23505" ? t("alreadyPending") : t("saveFailed") };
  refresh(bill.apartment_id);
  return { success: true };
}

export async function reviewBillProof(proofId: string, approve: boolean, _state: unknown, form: FormData) {
  const t = await getTranslations("Bills");
  const auth = await getUserWithAccess();
  if (!auth?.hasAccess) return { error: t("accessDenied") };
  if (!UUID.test(proofId) || typeof approve !== "boolean") return { error: t("notFound") };
  const invalid = validateForm(form, { note: { max: 1000, required: !approve } });
  if (invalid) return { error: invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_apartment_bill_proof", {
    p_proof_id: proofId, p_approve: approve, p_note: String(form.get("note") ?? "").trim() || null,
  });
  if (error) return { error: t("reviewFailed") };
  // Also update the apartment detail currently showing this proof.
  revalidatePath("/apartments/[apartmentId]", "page");
  refresh();
  return { success: true };
}

export async function setBillVisibility(billId: string, visible: boolean) {
  const t = await getTranslations("Bills");
  const auth = await getUserWithAccess();
  if (!auth?.hasAccess) return { error: t("accessDenied") };
  if (!UUID.test(billId) || typeof visible !== "boolean") return { error: t("notFound") };
  const supabase = await createClient();
  const { data, error } = await supabase.from("apartment_bills").update({ visible_to_tenant: visible })
    .eq("id", billId).eq("owner_id", auth.user.id).select("apartment_id").single();
  if (error || !data) return { error: t("saveFailed") };
  refresh(data.apartment_id);
  return { success: true };
}
