import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { billHorizon } from "@/lib/bills";

export default async function BillAlerts({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { count, error } = await supabase.from("apartment_bills").select("id", { count: "exact", head: true })
    .neq("owner_id", userId).is("paid_at", null).not("storage_path", "is", null).lte("due_date", billHorizon());
  if (error || !count) return null;
  const t = await getTranslations("Bills");
  return <div role="status"><Link href="/bills" className="block border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm underline underline-offset-4 md:px-6">
    {t("dueAlert", { count })}
  </Link></div>;
}
