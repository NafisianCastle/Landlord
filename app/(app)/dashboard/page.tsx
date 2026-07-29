import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatsCards from "@/components/dashboard/StatsCards";
import RentDueCard, { type OverduePaymentItem } from "@/components/dashboard/RentDueCard";
import LocationBreakdown from "@/components/dashboard/LocationBreakdown";
import RecentPlots from "@/components/dashboard/RecentPlots";
import NeedsAttention from "@/components/dashboard/NeedsAttention";
import WelcomeCard from "@/components/dashboard/WelcomeCard";
import GuestDashboard from "@/components/dashboard/GuestDashboard";
import PageContainer from "@/components/system/PageContainer";
import PageHeader from "@/components/system/PageHeader";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <GuestDashboard />;
  }

  await supabase.rpc("ensure_all_lease_payments");

  const [
    { data: stats, error: statsError },
    { data: byDistrict, error: districtError },
    { count: documentCount },
    { data: recentPlots, error: recentError },
    { data: unwalkedPlots },
    { count: apartmentCount },
    { data: rentStats },
    { data: overdueRows },
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
    supabase.from("lease_payment_stats").select("*").single(),
    supabase
      .from("lease_payments")
      .select(
        "id, due_date, amount, leases(tenant_name, plot_id, apartment_id, land_plots(name), apartments(name))",
      )
      .eq("paid", false)
      .lt("due_date", new Date().toISOString().slice(0, 10))
      .order("due_date", { ascending: true })
      .limit(5),
  ]);

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
          <NeedsAttention plots={unwalkedPlots ?? []} />

          <StatsCards
            plotCount={plotCount}
            totalAreaSqMeters={stats?.total_area_sq_meters ?? 0}
            totalPurchasePrice={stats?.total_purchase_price ?? 0}
            totalCurrentValue={stats?.total_current_value ?? 0}
            documentCount={documentCount ?? 0}
            apartmentCount={apartmentCount ?? 0}
          />

          <RentDueCard
            overdueCount={rentStats?.overdue_count ?? 0}
            overdueAmount={rentStats?.overdue_amount ?? 0}
            upcomingCount={rentStats?.upcoming_count ?? 0}
            overduePayments={overduePayments}
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
