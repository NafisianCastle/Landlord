import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { ApartmentBill, BillProof, TenantShare } from "@/lib/bills";
import BillCard from "./BillCard";
import BillForm from "./BillForm";

export default async function ApartmentBillSection({ apartmentId }: { apartmentId: string }) {
  const t = await getTranslations("Bills");
  const supabase = await createClient();
  const [bills, tenants] = await Promise.all([
    supabase.from("apartment_bills").select("id, apartment_id, owner_id, tenant_share_id, tenant_email, title, amount, due_date, visible_to_tenant, file_name, paid_at")
      .eq("apartment_id", apartmentId).not("file_name", "is", null).order("due_date", { ascending: false }),
    supabase.from("apartment_tenants").select("*").eq("apartment_id", apartmentId),
  ]);
  if (bills.error || tenants.error) return <p role="alert" className="text-sm text-destructive">{t("loadFailed")}</p>;
  const rows = bills.data as ApartmentBill[];
  const proofResult = rows.length ? await supabase.from("apartment_bill_proofs")
    .select("id, bill_id, file_name, status, review_note, created_at").in("bill_id", rows.map(b => b.id)).order("created_at", { ascending: false }) : { data: [], error: null };
  if (proofResult.error) return <p role="alert" className="text-sm text-destructive">{t("loadFailed")}</p>;
  const proofs = proofResult.data as BillProof[];
  return <section className="flex flex-col gap-4" aria-label={t("title")}>
    <div><h2 className="font-medium">{t("title")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("ownerHint")}</p></div>
    <details className="rounded-xl border border-border p-4" open={!rows.length}>
      <summary className="cursor-pointer text-sm font-medium">{t("createBill")}</summary>
      <div className="mt-4"><BillForm apartmentId={apartmentId} tenants={tenants.data as TenantShare[]} /></div>
    </details>
    {rows.map(bill => <BillCard key={bill.id} bill={bill} proofs={proofs.filter(p => p.bill_id === bill.id)} isOwner />)}
    {!rows.length && <p className="text-sm text-muted-foreground">{t("noBills")}</p>}
  </section>;
}
