import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatsCards from "@/components/dashboard/StatsCards";
import RentOverview, { loadRentOverview } from "@/components/dashboard/RentOverview";
import { Suspense } from "react";
import SectionLoading from "@/components/system/SectionLoading";
import LocationBreakdown from "@/components/dashboard/LocationBreakdown";
import RecentPlots from "@/components/dashboard/RecentPlots";
import NeedsAttention from "@/components/dashboard/NeedsAttention";
import WelcomeCard from "@/components/dashboard/WelcomeCard";
import GuestDashboard from "@/components/dashboard/GuestDashboard";
import PageContainer from "@/components/system/PageContainer";
import PageHeader from "@/components/system/PageHeader";

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDateInDays(days: number) {
  return new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return <GuestDashboard />;
  }

  const rentOverview = loadRentOverview();

  const [
    { data: stats, error: statsError },
    { data: byDistrict, error: districtError },
    { count: documentCount },
    { data: recentPlots, error: recentError },
    { data: unwalkedPlots },
    { count: apartmentCount },
    { data: expiringLeaseRows },
  ] = await Promise.all([
    supabase.from("plot_stats").select("*").single(),
    supabase.from("plot_stats_by_district").select("*"),
    supabase.from("plot_documents").select("id", { count: "exact", head: true }),
    supabase
      .from("land_plots")
      .select("id, name, village, district, area_sq_meters, user_id")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("land_plots")
      .select("id, name")
      .is("area_sq_meters", null)
      .order("created_at", { ascending: false }),
    supabase.from("apartments").select("id", { count: "exact", head: true }),
    supabase
      .from("leases")
      .select("id, tenant_name, end_date, plot_id, apartment_id, land_plots(name), apartments(name)")
      .eq("status", "active")
      .not("end_date", "is", null)
      .lte("end_date", isoDateInDays(14))
      .order("end_date", { ascending: true }),
  ]);

  const expiringLeases = (expiringLeaseRows ?? []).map((row) => {
    const lp = row.land_plots as unknown as { name: string } | null;
    const ap = row.apartments as unknown as { name: string } | null;
    return {
      id: row.id,
      tenantName: row.tenant_name,
      endDate: row.end_date as string,
      propertyHref: row.plot_id ? `/plots/${row.plot_id}` : `/apartments/${row.apartment_id}`,
      propertyName: lp?.name ?? ap?.name ?? "",
    };
  });

  const plotCount = stats?.plot_count ?? 0;
  const t = await getTranslations("DashboardPage");

  return (
    <PageContainer>
      <PageHeader
        title={t("welcome", {
          name: (user?.user_metadata?.full_name as string | undefined) || user?.email || "",
        })}
        action={
          <Button asChild size="sm">
            <Link href="/plots/new">{t("addPlot")}</Link>
          </Button>
        }
      />

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
          <NeedsAttention plots={unwalkedPlots ?? []} expiringLeases={expiringLeases} />

          <StatsCards
            plotCount={plotCount}
            totalAreaSqMeters={stats?.total_area_sq_meters ?? 0}
            totalPurchasePrice={stats?.total_purchase_price ?? 0}
            totalCurrentValue={stats?.total_current_value ?? 0}
            documentCount={documentCount ?? 0}
            apartmentCount={apartmentCount ?? 0}
          />

          <Suspense fallback={<SectionLoading />}>
            <RentOverview data={rentOverview} />
          </Suspense>

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
                  shared: p.user_id !== user?.id,
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
    </PageContainer>
  );
}
