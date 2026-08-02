"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithAccess } from "@/lib/access";

export type MaintenanceSubjectType = "plot" | "apartment";

function subjectPath(subjectType: MaintenanceSubjectType, subjectId: string) {
  return subjectType === "plot" ? `/plots/${subjectId}` : `/apartments/${subjectId}`;
}

function fieldsFromForm(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "") || null,
    cost: formData.get("cost") ? Number(formData.get("cost")) : null,
    reported_date: String(formData.get("reportedDate") ?? "") || new Date().toISOString().slice(0, 10),
  };
}

export async function createMaintenanceRequest(
  subjectType: MaintenanceSubjectType,
  subjectId: string,
  _prevState: unknown,
  formData: FormData,
) {
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");
  if (!auth.hasAccess) redirect("/paywall");
  const { user } = auth;

  const t = await getTranslations("MaintenanceActions");
  const fields = fieldsFromForm(formData);
  if (!fields.title) return { error: t("titleRequired") };

  const supabase = await createClient();
  const { error } = await supabase.from("maintenance_requests").insert({
    user_id: user.id,
    plot_id: subjectType === "plot" ? subjectId : null,
    apartment_id: subjectType === "apartment" ? subjectId : null,
    ...fields,
  });

  if (error) return { error: error.message };

  revalidatePath(subjectPath(subjectType, subjectId));
  return { success: true };
}

export async function updateMaintenanceStatus(
  requestId: string,
  subjectType: MaintenanceSubjectType,
  subjectId: string,
  status: "open" | "in_progress" | "resolved",
) {
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");

  const supabase = await createClient();
  const { error } = await supabase
    .from("maintenance_requests")
    .update({
      status,
      resolved_date: status === "resolved" ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq("id", requestId);
  if (error) return { error: error.message };

  revalidatePath(subjectPath(subjectType, subjectId));
  return { success: true };
}

export async function deleteMaintenanceRequest(
  requestId: string,
  subjectType: MaintenanceSubjectType,
  subjectId: string,
) {
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");

  const supabase = await createClient();
  const { error } = await supabase.from("maintenance_requests").delete().eq("id", requestId);
  if (error) return { error: error.message };

  revalidatePath(subjectPath(subjectType, subjectId));
  return { success: true };
}
