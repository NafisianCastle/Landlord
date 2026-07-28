"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { listGuestPlots, type GuestPlot } from "@/lib/offline/guestPlots";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatsCards from "@/components/dashboard/StatsCards";
import LocationBreakdown from "@/components/dashboard/LocationBreakdown";
import RecentPlots from "@/components/dashboard/RecentPlots";
import NeedsAttention from "@/components/dashboard/NeedsAttention";
import WelcomeCard from "@/components/dashboard/WelcomeCard";
import PageContainer from "@/components/system/PageContainer";

export default function GuestDashboard() {
  const t = useTranslations("DashboardPage");
  const tGuest = useTranslations("GuestMode");
  const [plots, setPlots] = useState<GuestPlot[] | null>(null);

  useEffect(() => {
    listGuestPlots().then(setPlots);
  }, []);

  if (plots === null) return null;

  const plotCount = plots.length;
  const totalAreaSqMeters = plots.reduce((sum, p) => sum + (p.areaSqMeters ?? 0), 0);
  const totalPurchasePrice = plots.reduce((sum, p) => sum + (p.purchasePrice ?? 0), 0);
  const totalCurrentValue = plots.reduce((sum, p) => sum + (p.currentEstimatedValue ?? 0), 0);
  const unwalkedPlots = plots.filter((p) => p.areaSqMeters == null);

  const byDistrict = new Map<string, { plotCount: number; totalAreaSqMeters: number }>();
  for (const p of plots) {
    if (!p.district) continue;
    const entry = byDistrict.get(p.district) ?? { plotCount: 0, totalAreaSqMeters: 0 };
    entry.plotCount += 1;
    entry.totalAreaSqMeters += p.areaSqMeters ?? 0;
    byDistrict.set(p.district, entry);
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">{tGuest("welcomeGuest")}</h1>
        <Button asChild size="sm" className="self-start sm:self-auto">
          <Link href="/plots/new">{t("addPlot")}</Link>
        </Button>
      </div>

      {plotCount === 0 ? (
        <WelcomeCard />
      ) : (
        <>
          <NeedsAttention plots={unwalkedPlots} />

          <StatsCards
            plotCount={plotCount}
            totalAreaSqMeters={totalAreaSqMeters}
            totalPurchasePrice={totalPurchasePrice}
            totalCurrentValue={totalCurrentValue}
            documentCount={0}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("recentPlots")}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <RecentPlots
                plots={plots.slice(0, 5).map((p) => ({
                  id: p.id,
                  name: p.name,
                  village: p.village,
                  district: p.district,
                  areaSqMeters: p.areaSqMeters,
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
                districts={Array.from(byDistrict.entries()).map(([district, stats]) => ({
                  district,
                  ...stats,
                }))}
              />
            </CardContent>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
