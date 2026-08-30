"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithAccess } from "@/lib/access";

function fieldsFromForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    trade: String(formData.get("trade") ?? "") || null,
    phone: String(formData.get("phone") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
  };
}

export async function createVendor(_prevState: unknown, formData: FormData) {
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");
  if (!auth.hasAccess) redirect("/paywall");
  const { user } = auth;

  const t = await getTranslations("VendorActions");
  const fields = fieldsFromForm(formData);
  if (!fields.name) return { error: t("nameRequired") };

  const supabase = await createClient();
  const { error } = await supabase.from("vendors").insert({ user_id: user.id, ...fields });
  if (error) return { error: error.message };

  revalidatePath("/vendors");
  return { success: true };
}

export async function updateVendor(vendorId: string, _prevState: unknown, formData: FormData) {
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");

  const t = await getTranslations("VendorActions");
  const fields = fieldsFromForm(formData);
  if (!fields.name) return { error: t("nameRequired") };

  const supabase = await createClient();
  const { error } = await supabase.from("vendors").update(fields).eq("id", vendorId);
  if (error) return { error: error.message };

  revalidatePath("/vendors");
  return { success: true };
}

export async function deleteVendor(vendorId: string) {
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");

  const supabase = await createClient();
  const { error } = await supabase.from("vendors").delete().eq("id", vendorId);
  if (error) return { error: error.message };

  revalidatePath("/vendors");
  return { success: true };
}
