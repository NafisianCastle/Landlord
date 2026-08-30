import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import PageContainer from "@/components/system/PageContainer";
import PageHeader from "@/components/system/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function LeasesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const t = await getTranslations("LeasesPage");

  if (!user) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
        <p className="text-sm text-muted-foreground">{t("signInRequired")}</p>
      </div>
    );
  }

  await supabase.rpc("ensure_all_lease_payments");

  const [{ data: leases, error }, { data: unpaidPayments }, { data: rentStats }, { data: expenseStats }] =
    await Promise.all([
    supabase
      .from("leases")
      .select(
        "id, tenant_name, rent_amount, frequency, status, plot_id, apartment_id, land_plots(name), apartments(name)",
      )
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("lease_payments")
      .select("lease_id, due_date")
      .eq("paid", false)
      .order("due_date", { ascending: true }),
    supabase.from("lease_payment_stats").select("*").single(),
    supabase.from("expense_stats").select("*").single(),
  ]);

  const nextDueByLease = new Map<string, string>();
  for (const p of unpaidPayments ?? []) {
    if (!nextDueByLease.has(p.lease_id)) nextDueByLease.set(p.lease_id, p.due_date);
  }

  const bdt = new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  });

  const rows = (leases ?? []).map((lease) => {
    const landPlot = lease.land_plots as unknown as { name: string } | null;
    const apartment = lease.apartments as unknown as { name: string } | null;
    return {
      id: lease.id,
      tenantName: lease.tenant_name,
      rentAmount: lease.rent_amount,
      frequency: lease.frequency,
      propertyName: landPlot?.name ?? apartment?.name ?? "",
      propertyHref: lease.plot_id ? `/plots/${lease.plot_id}` : `/apartments/${lease.apartment_id}`,
      nextDue: nextDueByLease.get(lease.id) ?? null,
    };
  });

  return (
    <PageContainer>
      <PageHeader
        title={t("title")}
        action={
          <Button asChild variant="outline" size="sm">
            <a href="/api/reports/lease-payments">{t("exportCsv")}</a>
          </Button>
        }
      />

      <Card>
        <CardContent className="grid grid-cols-3 gap-3 p-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground">{t("receivedThisMonth")}</p>
            <p className="font-semibold">{bdt.format(rentStats?.received_this_month_amount ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("expensesThisMonth")}</p>
            <p className="font-semibold">{bdt.format(expenseStats?.this_month_amount ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("netThisMonth")}</p>
            <p className="font-semibold">
              {bdt.format(
                (rentStats?.received_this_month_amount ?? 0) - (expenseStats?.this_month_amount ?? 0),
              )}
            </p>
          </div>
        </CardContent>
      </Card>
      <a
        href="/api/reports/finances"
        className="self-start text-xs text-muted-foreground underline underline-offset-2"
      >
        {t("exportExpensesCsv")}
      </a>

      {error ? (
        <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {t("loadError", { message: error.message })}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {rows.map((row) => (
            <li key={row.id} className="p-3">
              <Link href={row.propertyHref} className="flex flex-col">
                <span className="font-medium">
                  {row.tenantName} · {row.propertyName}
                </span>
                <span className="text-sm text-muted-foreground">
                  {bdt.format(row.rentAmount)} · {t(`frequency.${row.frequency}`)}
                  {row.nextDue ? ` · ${t("nextDue", { date: row.nextDue })}` : ` · ${t("allPaid")}`}
                </span>
              </Link>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">{t("noLeasesYet")}</li>
          )}
        </ul>
      )}
    </PageContainer>
  );
}
