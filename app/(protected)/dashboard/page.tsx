import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatsCards from "@/components/dashboard/StatsCards";
import LocationBreakdown from "@/components/dashboard/LocationBreakdown";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: stats }, { data: byDistrict }] = await Promise.all([
    supabase.from("plot_stats").select("*").single(),
    supabase.from("plot_stats_by_district").select("*"),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <h1 className="text-xl font-semibold">Welcome, {user?.email}</h1>

      <StatsCards
        plotCount={stats?.plot_count ?? 0}
        totalAreaSqMeters={stats?.total_area_sq_meters ?? 0}
        totalPurchasePrice={stats?.total_purchase_price ?? 0}
        totalCurrentValue={stats?.total_current_value ?? 0}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">By district</CardTitle>
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
    </div>
  );
}
