import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const bdt = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

export default async function AdminOverviewPage() {
  const t = await getTranslations("AdminOverviewPage");
  const admin = createAdminClient();

  const [
    { count: totalUsers },
    { count: activeTrials },
    { count: paidUsers },
    { data: completedPayments },
    { count: referredSignups },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gt("trial_ends_at", new Date().toISOString()),
    admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "completed"),
    admin.from("payment_transactions").select("amount").eq("status", "completed"),
    admin.from("profiles").select("id", { count: "exact", head: true }).not("referred_by", "is", null),
  ]);

  const revenue = (completedPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

  const stats = [
    { label: t("totalUsers"), value: totalUsers ?? 0 },
    { label: t("activeTrials"), value: activeTrials ?? 0 },
    { label: t("paidUsers"), value: paidUsers ?? 0 },
    { label: t("totalRevenue"), value: bdt.format(revenue) },
    { label: t("referredSignups"), value: referredSignups ?? 0 },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
