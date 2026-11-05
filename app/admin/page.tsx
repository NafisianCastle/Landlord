import { getTranslations } from "next-intl/server";
import { getAdminOverview } from "@/lib/adminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const bdt = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

export default async function AdminOverviewPage() {
  const t = await getTranslations("AdminOverviewPage");
  const overview = await getAdminOverview();

  const stats = [
    { label: t("totalUsers"), value: overview.totalUsers },
    { label: t("activeTrials"), value: overview.activeTrials },
    { label: t("paidUsers"), value: overview.paidUsers },
    { label: t("totalRevenue"), value: bdt.format(overview.revenue) },
    { label: t("referredSignups"), value: overview.referredSignups },
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
