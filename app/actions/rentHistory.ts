"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getUserWithAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { expandRentRanges } from "@/lib/rent-history";
import { UUID } from "@/lib/validation/forms";
import type { LeaseSubjectType } from "./leases";

export async function recordRentHistory(leaseId: string, subjectType: LeaseSubjectType, subjectId: string, ranges: unknown) {
  const t = await getTranslations("RentHistory");
  const auth = await getUserWithAccess();
  if (!auth?.hasAccess) return { error: t("accessRequired") };
  if (!UUID.test(leaseId) || !UUID.test(subjectId) || !["plot", "apartment"].includes(subjectType)) return { error: t("saveFailed") };
  const supabase = await createClient();
  const { data: lease, error } = await supabase.from("leases").select("start_date, end_date, frequency")
    .eq("id", leaseId).eq("user_id", auth.user.id)
    .eq(subjectType === "plot" ? "plot_id" : "apartment_id", subjectId).maybeSingle();
  if (error || !lease) return { error: t("saveFailed") };
  if (lease.frequency !== "monthly") return { error: t("monthlyOnly") };
  const validation = expandRentRanges(ranges, lease.start_date, lease.end_date, new Date().toISOString().slice(0, 10));
  if (validation.error) return { error: t(validation.error) };
  const { data, error: saveError } = await supabase.rpc("record_rent_history", { p_lease_id: leaseId, p_ranges: ranges });
  if (saveError || !data) return { error: t("saveFailed") };
  revalidatePath(`/${subjectType === "plot" ? "plots" : "apartments"}/${subjectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/leases");
  return { success: true, recorded: Number(data.recorded), skipped: Number(data.skipped) };
}
