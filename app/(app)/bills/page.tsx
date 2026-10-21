import Link from "next/link";
import { redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import type { ApartmentBill, BillProof, TenantShare } from "@/lib/bills";
import BillCard from "@/components/bills/BillCard";
import RentReminderSettings from "@/components/profile/RentReminderSettings";
import { getRentReminderPublicKey } from "@/lib/pushConfig";

export default async function BillsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getTranslations("Bills");
  const te = await getTranslations("ExpensesList");
  const format = await getFormatter();
  const supabase = await createClient();
  const [billResult, shareResult, proofResult, expenseResult] = await Promise.all([
    supabase.from("apartment_bills").select("id, apartment_id, owner_id, tenant_share_id, tenant_email, title, amount, due_date, visible_to_tenant, file_name, paid_at")
      .not("file_name", "is", null).order("due_date", { ascending: false }),
    supabase.from("apartment_tenants").select("*"),
    supabase.from("apartment_bill_proofs").select("id, bill_id, file_name, status, review_note, created_at").order("created_at", { ascending: false }),
    supabase.from("expenses").select("id, apartment_id, category, amount, expense_date, notes")
      .eq("visible_to_tenants", true).neq("user_id", user.id).order("expense_date", { ascending: false }),
  ]);
  const failed = [billResult, shareResult, proofResult, expenseResult].some(r => r.error);
  if (failed) return <div className="mx-auto max-w-2xl p-6"><p role="alert" className="text-sm text-destructive">{t("loadFailed")}</p></div>;
  const bills = billResult.data as ApartmentBill[];
  const shares = shareResult.data as TenantShare[];
  const proofs = proofResult.data as BillProof[];
  const pendingCount = bills.filter(b => b.owner_id === user.id && proofs.some(p => p.bill_id === b.id && p.status === "pending")).length;
  const label = (apartmentId: string) => shares.find(s => s.apartment_id === apartmentId)?.apartment_label;
  return <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-6">
    <div><h1 className="text-2xl font-semibold">{t("title")}</h1><p className="mt-1 text-sm text-muted-foreground">{t("portalHint")}</p></div>
    {pendingCount > 0 && <p role="status" className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">{t("reviewAlert", { count: pendingCount })}</p>}
    <details className="rounded-xl border border-border p-4">
      <summary className="cursor-pointer text-sm font-medium">{t("notifications")}</summary>
      <div className="mt-3"><p className="mb-3 text-sm text-muted-foreground">{t("notificationHint")}</p><RentReminderSettings publicKey={getRentReminderPublicKey()} /></div>
    </details>
    {!bills.length && <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">{t("noBills")}</p>}
    {bills.map(bill => <div key={bill.id} className="flex flex-col gap-2">
      {bill.owner_id === user.id && <Link className="w-fit text-sm text-primary underline" href={`/apartments/${bill.apartment_id}`}>{t("manageApartment")}</Link>}
      <BillCard bill={bill} proofs={proofs.filter(p => p.bill_id === bill.id)} isOwner={bill.owner_id === user.id} apartmentLabel={label(bill.apartment_id)} />
    </div>)}
    <section className="flex flex-col gap-3" aria-label={t("sharedExpenses")}>
      <h2 className="font-medium">{t("sharedExpenses")}</h2>
      <p className="text-sm text-muted-foreground">{t("sharedExpensesHint")}</p>
      {!expenseResult.data?.length && <p className="text-sm text-muted-foreground">{t("noSharedExpenses")}</p>}
      {expenseResult.data?.map(expense => <article key={expense.id} className="flex flex-col gap-1 rounded-xl border border-border p-4 text-sm">
        <h3 className="font-medium">{te(`categoryOption.${expense.category}`)}</h3>
        <p className="text-muted-foreground">{label(expense.apartment_id)}</p>
        <p>{format.number(Number(expense.amount), { style: "currency", currency: "BDT" })}{" · "}{expense.expense_date}</p>
        {expense.notes && <p className="break-words text-muted-foreground">{expense.notes}</p>}
      </article>)}
    </section>
  </div>;
}
