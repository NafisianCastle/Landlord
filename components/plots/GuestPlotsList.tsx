"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Polygon } from "geojson";
import { listGuestPlots, type GuestPlot } from "@/lib/offline/guestPlots";
import { Button } from "@/components/ui/button";
import PlotsMapClient from "@/app/(app)/plots/PlotsMapClient";
import PlotsListClient from "@/components/plots/PlotsListClient";
import PageContainer from "@/components/system/PageContainer";
import PageHeader from "@/components/system/PageHeader";

export default function GuestPlotsList() {
  const t = useTranslations("PlotsPage");
  const [plots, setPlots] = useState<GuestPlot[] | null>(null);

  useEffect(() => {
    listGuestPlots().then(setPlots);
  }, []);

  if (plots === null) return null;

  return (
    <PageContainer>
      <PageHeader
        title={t("title")}
        action={
          <Button asChild>
            <Link href="/plots/new">{t("addPlot")}</Link>
          </Button>
        }
      />

      <PlotsMapClient
        plots={plots
          .filter((p): p is GuestPlot & { boundaryGeojson: Polygon } => p.boundaryGeojson !== null)
          .map((p) => ({
            id: p.id,
            name: p.name,
            village: p.village,
            district: p.district,
            areaSqMeters: p.areaSqMeters,
            boundary: p.boundaryGeojson,
          }))}
      />

      <PlotsListClient
        plots={plots.map((p) => ({
          id: p.id,
          name: p.name,
          village: p.village,
          district: p.district,
          areaSqMeters: p.areaSqMeters,
        }))}
      />
    </PageContainer>
  );
}
