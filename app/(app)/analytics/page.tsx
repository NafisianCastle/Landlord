import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import PageContainer from "@/components/system/PageContainer";
import PageHeader from "@/components/system/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import TrendChart, { type MonthlyPoint } from "@/components/analytics/TrendChart";

const bdt = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const t = await getTranslations("AnalyticsPage");

  if (!user) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
        <p className="text-sm text-muted-foreground">{t("signInRequired")}</p>
      </div>
    );
  }

  const [{ data: occupancy }, { data: monthly }, { data: plots }, { data: apartments }] = await Promise.all([
    supabase.from("occupancy_stats").select("*").single(),
    supabase.from("portfolio_monthly_stats").select("*"),
    supabase.from("land_plots").select("id, name, purchase_price"),
    supabase.from("apartments").select("id, name, purchase_price"),
  ]);

  const { data: financials } = await supabase.from("property_financial_stats").select("*");
  const financialsBySubject = new Map((financials ?? []).map((f) => [f.subject_id, f]));

  const occupancyRate =
    occupancy && occupancy.total_units > 0 ? (occupancy.leased_units / occupancy.total_units) * 100 : null;

  const points: MonthlyPoint[] = (monthly ?? []).map((m) => ({
    month: m.month,
    income: m.income_amount,
    expense: m.expense_amount,
  }));

  const trailing12 = (financials ?? []).reduce(
    (acc, f) => ({ income: acc.income + f.income_12mo, expenses: acc.expenses + f.expenses_12mo }),
    { income: 0, expenses: 0 },
  );
  const portfolioProfit12mo = trailing12.income - trailing12.expenses;

  const roiRows = [
    ...(plots ?? []).map((p) => ({ id: p.id, name: p.name, href: `/plots/${p.id}`, purchasePrice: p.purchase_price })),
    ...(apartments ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      href: `/apartments/${a.id}`,
      purchasePrice: a.purchase_price,
    })),
  ].map((row) => {
    const f = financialsBySubject.get(row.id);
    const annualIncome = f?.income_12mo ?? 0;
    const roi =
      row.purchasePrice && row.purchasePrice > 0 ? (annualIncome / row.purchasePrice) * 100 : null;
    return { ...row, annualIncome, roi };
  });

  return (
    <PageContainer>
      <PageHeader title={t("title")} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{t("occupancyRate")}</p>
            <p className="text-lg font-semibold">{occupancyRate !== null ? `${occupancyRate.toFixed(0)}%` : "—"}</p>
            {occupancy && (
              <p className="text-xs text-muted-foreground">
                {t("unitsLeased", { leased: occupancy.leased_units, total: occupancy.total_units })}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{t("portfolioProfit12mo")}</p>
            <p className={`text-lg font-semibold ${portfolioProfit12mo < 0 ? "text-destructive" : ""}`}>
              {bdt.format(portfolioProfit12mo)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-3 text-sm font-medium">{t("incomeVsExpense")}</h2>
          <TrendChart points={points} />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 font-medium">{t("roiPerProperty")}</h2>
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {roiRows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-2 p-3 text-sm">
              <a href={row.href} className="min-w-0 truncate underline underline-offset-2">
                {row.name}
              </a>
              <span className="shrink-0 text-muted-foreground">
                {row.roi !== null ? t("roiValue", { value: row.roi.toFixed(1) }) : "—"}
              </span>
            </li>
          ))}
          {roiRows.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">{t("noPropertiesYet")}</li>
          )}
        </ul>
      </div>
    </PageContainer>
  );
}
