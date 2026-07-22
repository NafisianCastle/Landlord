"use client";

import { useState } from "react";
import type { Polygon } from "geojson";
import PlotMap from "@/components/map/PlotMap";
import BoundaryWalker from "@/components/map/BoundaryWalker";

interface PlotBoundarySectionProps {
  plotId: string;
  plotName: string;
  boundary: Polygon | null;
}

export default function PlotBoundarySection({
  plotId,
  plotName,
  boundary,
}: PlotBoundarySectionProps) {
  const [redrawing, setRedrawing] = useState(false);

  if (!boundary || redrawing) {
    return <BoundaryWalker plotId={plotId} />;
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
