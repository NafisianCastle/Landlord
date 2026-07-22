"use client";

import { useState } from "react";
import type { Polygon } from "geojson";
import PlotMap from "@/components/map/PlotMap";
import BoundaryWalker from "@/components/map/BoundaryWalker";
import ManualBoundaryDrawer from "@/components/map/ManualBoundaryDrawer";

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
          <button
            type="button"
            onClick={() => setMode("gps")}
            className={`rounded px-3 py-1 ${mode === "gps" ? "bg-black text-white" : "border"}`}
          >
            Walk with GPS
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`rounded px-3 py-1 ${mode === "manual" ? "bg-black text-white" : "border"}`}
          >
            Draw on map
          </button>
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
      <button
        type="button"
        onClick={() => setRedrawing(true)}
        className="self-start text-sm underline"
      >
        Redraw boundary
      </button>
    </div>
  );
}
