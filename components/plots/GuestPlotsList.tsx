"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Polygon } from "geojson";
import { listGuestPlots, type GuestPlot } from "@/lib/offline/guestPlots";
import { Button } from "@/components/ui/button";
import PlotsMapClient from "@/app/(app)/plots/PlotsMapClient";
import PlotsListClient from "@/components/plots/PlotsListClient";

export default function GuestPlotsList() {
  const t = useTranslations("PlotsPage");
  const [plots, setPlots] = useState<GuestPlot[] | null>(null);

  useEffect(() => {
    listGuestPlots().then(setPlots);
  }, []);

  if (plots === null) return null;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <Button asChild>
          <Link href="/plots/new">{t("addPlot")}</Link>
        </Button>
      </div>

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
    </div>
  );
}
