"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { deleteAccount, exportAccountData } from "@/lib/account";
import { validateForm } from "@/lib/validation/forms";

export async function exportMyData(): Promise<{ error?: string; json?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: (await getTranslations("AuthActions"))("notAuthenticated") };
  return { json: JSON.stringify(await exportAccountData(user), null, 2) };
}

export async function deleteMyAccount(_prevState: unknown, formData: FormData) {
  const validationError = validateForm(formData, {
    confirmation: { max: 254 },
    password: { max: 1024, preserveWhitespace: true },
  });
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = await getTranslations("YourData");
  if (!user) return { error: (await getTranslations("AuthActions"))("notAuthenticated") };

  const result = await deleteAccount(
    user,
    String(formData.get("confirmation") ?? ""),
    String(formData.get("password") ?? ""),
  );
  if (result.error) return { error: t(result.error) };

  await supabase.auth.signOut();
  redirect("/");
}
