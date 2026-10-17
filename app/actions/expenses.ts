"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithAccess } from "@/lib/access";
import { validateForm, expenseRules } from "@/lib/validation/forms";

export type ExpenseSubjectType = "plot" | "apartment";
export type ExpenseCategory =
  | "tax"
  | "insurance"
  | "utility"
  | "repair"
  | "management_fee"
  | "other";

function subjectPath(subjectType: ExpenseSubjectType, subjectId: string) {
  return subjectType === "plot" ? `/plots/${subjectId}` : `/apartments/${subjectId}`;
}

function fieldsFromForm(formData: FormData) {
  return {
    category: String(formData.get("category") ?? "other") as ExpenseCategory,
    amount: Number(formData.get("amount") ?? 0),
    expense_date: String(formData.get("expenseDate") ?? "") || new Date().toISOString().slice(0, 10),
    notes: String(formData.get("notes") ?? "") || null,
  };
}

export async function createExpense(
  subjectType: ExpenseSubjectType,
  subjectId: string,
  _prevState: unknown,
  formData: FormData,
) {
  if (subjectType !== "plot" && subjectType !== "apartment") return { error: "Invalid property type." };
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");
  if (!auth.hasAccess) redirect("/paywall");
  const { user } = auth;

  const t = await getTranslations("ExpenseActions");

  const validationError = validateForm(formData, expenseRules);
  if (validationError) return { error: validationError };

  const fields = fieldsFromForm(formData);
  if (!fields.amount || fields.amount <= 0) return { error: t("amountRequired") };

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    plot_id: subjectType === "plot" ? subjectId : null,
    apartment_id: subjectType === "apartment" ? subjectId : null,
    ...fields,
  });

  if (error) return { error: error.message };

  revalidatePath(subjectPath(subjectType, subjectId));
  revalidatePath("/analytics");
  return { success: true };
}

export async function deleteExpense(
  expenseId: string,
  subjectType: ExpenseSubjectType,
  subjectId: string,
) {
  if (subjectType !== "plot" && subjectType !== "apartment") return { error: "Invalid property type." };
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) return { error: error.message };

  revalidatePath(subjectPath(subjectType, subjectId));
  revalidatePath("/analytics");
  return { success: true };
}
