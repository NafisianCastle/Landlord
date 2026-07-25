import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatsCards from "@/components/dashboard/StatsCards";
import LocationBreakdown from "@/components/dashboard/LocationBreakdown";
import RecentPlots from "@/components/dashboard/RecentPlots";
import NeedsAttention from "@/components/dashboard/NeedsAttention";
import WelcomeCard from "@/components/dashboard/WelcomeCard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: stats, error: statsError },
    { data: byDistrict, error: districtError },
    { count: documentCount },
    { data: recentPlots, error: recentError },
    { data: unwalkedPlots },
  ] = await Promise.all([
    supabase.from("plot_stats").select("*").single(),
    supabase.from("plot_stats_by_district").select("*"),
    supabase.from("plot_documents").select("id", { count: "exact", head: true }),
    supabase
      .from("land_plots")
      .select("id, name, village, district, area_sq_meters")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("land_plots")
      .select("id, name")
      .is("area_sq_meters", null)
      .order("created_at", { ascending: false }),
  ]);

  const plotCount = stats?.plot_count ?? 0;
  const t = await getTranslations("DashboardPage");

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="truncate text-xl font-semibold">{t("welcome", { email: user?.email ?? "" })}</h1>
        <Button asChild size="sm">
          <Link href="/plots/new">{t("addPlot")}</Link>
        </Button>
      </div>

      {(statsError || districtError || recentError) && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {t("statsLoadError")}
        </p>
      )}

      {plotCount === 0 ? (
        <WelcomeCard />
      ) : (
        <>
          <NeedsAttention plots={unwalkedPlots ?? []} />

          <StatsCards
            plotCount={plotCount}
            totalAreaSqMeters={stats?.total_area_sq_meters ?? 0}
            totalPurchasePrice={stats?.total_purchase_price ?? 0}
            totalCurrentValue={stats?.total_current_value ?? 0}
            documentCount={documentCount ?? 0}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("recentPlots")}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <RecentPlots
                plots={(recentPlots ?? []).map((p) => ({
                  id: p.id,
                  name: p.name,
                  village: p.village,
                  district: p.district,
                  areaSqMeters: p.area_sq_meters,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("byDistrict")}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <LocationBreakdown
                districts={(byDistrict ?? []).map((d) => ({
                  district: d.district,
                  plotCount: d.plot_count,
                  totalAreaSqMeters: d.total_area_sq_meters,
                }))}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
