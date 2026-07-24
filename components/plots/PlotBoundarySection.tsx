"use client";

import { useState } from "react";
import type { Polygon } from "geojson";
import PlotMap from "@/components/map/PlotMap";
import BoundaryWalker from "@/components/map/BoundaryWalker";
import ManualBoundaryDrawer from "@/components/map/ManualBoundaryDrawer";
import { Button } from "@/components/ui/button";

interface PlotBoundarySectionProps {
  plotId: string;
  plotName: string;
  boundary: Polygon | null;
}

type Mode = "gps" | "manual";

export default function PlotBoundarySection({
  plotId,
  plotName,
  boundary,
}: PlotBoundarySectionProps) {
  const [redrawing, setRedrawing] = useState(false);
  const [mode, setMode] = useState<Mode>("gps");

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
            Walk with GPS
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "manual" ? "default" : "outline"}
            onClick={() => setMode("manual")}
          >
            Draw on map
          </Button>
        </div>
        {mode === "gps" ? (
          <BoundaryWalker plotId={plotId} />
        ) : (
          <ManualBoundaryDrawer plotId={plotId} />
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
        Redraw boundary
      </Button>
    </div>
  );
}
