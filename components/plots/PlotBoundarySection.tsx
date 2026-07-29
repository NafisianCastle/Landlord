"use client";

import { useState } from "react";
import type { Polygon } from "geojson";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { LatLng } from "@/lib/geo";

const PlotMap = dynamic(() => import("@/components/map/PlotMap"), { ssr: false });
const BoundaryWalker = dynamic(() => import("@/components/map/BoundaryWalker"), { ssr: false });
const ManualBoundaryDrawer = dynamic(() => import("@/components/map/ManualBoundaryDrawer"), {
  ssr: false,
});

interface PlotBoundarySectionProps {
  plotId: string;
  plotName: string;
  boundary: Polygon | null;
  /** Overridable so guest mode (no Supabase session) can save the boundary locally instead. */
  onSaveBoundary?: (plotId: string, points: LatLng[]) => Promise<{ error?: string }>;
}

type Mode = "gps" | "manual";

export default function PlotBoundarySection({
  plotId,
  plotName,
  boundary,
  onSaveBoundary,
}: PlotBoundarySectionProps) {
  const [redrawing, setRedrawing] = useState(false);
  const [mode, setMode] = useState<Mode>("gps");
  const t = useTranslations("PlotBoundarySection");

  if (!boundary || redrawing) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 text-sm">
          <Button
            type="button"
            size="sm"
            variant={mode === "gps" ? "default" : "outline"}
            onClick={() => setMode("gps")}
          >
            {t("walkWithGps")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "manual" ? "default" : "outline"}
            onClick={() => setMode("manual")}
          >
            {t("drawOnMap")}
          </Button>
        </div>
        {mode === "gps" ? (
          <BoundaryWalker plotId={plotId} onFinish={onSaveBoundary} onSaved={() => setRedrawing(false)} />
        ) : (
          <ManualBoundaryDrawer plotId={plotId} onSave={onSaveBoundary} onSaved={() => setRedrawing(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <PlotMap
        plots={[{ id: plotId, name: plotName, boundary }]}
        className="h-[70vh] min-h-[420px] w-full rounded"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => setRedrawing(true)}
      >
        {t("redrawBoundary")}
      </Button>
    </div>
  );
}
