import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import RentDueCard, { type OverduePaymentItem } from "./RentDueCard";

/** Start alongside the overview queries, but keep schedule-dependent data ordered. */
export async function loadRentOverview() {
  const supabase = await createClient();
  const paymentsReady = Promise.resolve(supabase.rpc("ensure_all_lease_payments"));
  return Promise.all([
    paymentsReady.then(() => supabase.from("lease_payment_stats").select("*").single()),
    paymentsReady.then(() => supabase.from("lease_payments")
      .select("id, due_date, amount, leases(tenant_name, plot_id, apartment_id, land_plots(name), apartments(name))")
      .eq("paid", false)
      .lt("due_date", new Date().toISOString().slice(0, 10))
      .order("due_date", { ascending: true })
      .limit(5)),
    supabase.from("expense_stats").select("*").single(),
  ]);
}

export default async function RentOverview({ data }: { data: ReturnType<typeof loadRentOverview> }) {
  const [{ data: rentStats }, { data: overdueRows }, { data: expenseStats }] = await data;
  const t = await getTranslations("DashboardPage");
  const netThisMonth = (rentStats?.received_this_month_amount ?? 0) - (expenseStats?.this_month_amount ?? 0);

  const overduePayments: OverduePaymentItem[] = (overdueRows ?? []).flatMap((row) => {
    const lease = row.leases as unknown as {
      tenant_name: string;
      plot_id: string | null;
      apartment_id: string | null;
      land_plots: { name: string } | null;
      apartments: { name: string } | null;
    } | null;
    if (!lease) return [];
    const propertyName = lease.land_plots?.name ?? lease.apartments?.name ?? "";
    const propertyHref = lease.plot_id ? `/plots/${lease.plot_id}` : `/apartments/${lease.apartment_id}`;
    return [
      {
        id: row.id,
        dueDate: row.due_date,
        amount: row.amount,
        tenantName: lease.tenant_name,
        propertyName,
        propertyHref,
      },
    ];
  });

  return (
    <>
      <Card>
        <CardContent className="flex items-center justify-between gap-3 pt-6">
          <div>
            <p className="text-xs text-muted-foreground">{t("netThisMonth")}</p>
            <p className={`text-lg font-semibold ${netThisMonth < 0 ? "text-destructive" : ""}`}>
              {new Intl.NumberFormat("en-BD", {
                style: "currency",
                currency: "BDT",
                maximumFractionDigits: 0,
              }).format(netThisMonth)}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/analytics">{t("viewAnalytics")}</Link>
          </Button>
        </CardContent>
      </Card>

      <RentDueCard
        overdueCount={rentStats?.overdue_count ?? 0}
        overdueAmount={rentStats?.overdue_amount ?? 0}
        upcomingCount={rentStats?.upcoming_count ?? 0}
        overduePayments={overduePayments}
      />
    </>
  );
}
