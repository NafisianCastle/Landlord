"use client";

import { useRouter } from "next/navigation";
import PlotMap, { type PlotMapFeature } from "@/components/map/PlotMap";

export default function PlotsMapClient({ plots }: { plots: PlotMapFeature[] }) {
  const router = useRouter();

  if (plots.length === 0) {
    return (
      <div className="flex h-[60vh] min-h-[360px] items-center justify-center rounded border bg-neutral-50 text-sm text-neutral-500">
        No walked boundaries yet — plots with a drawn boundary appear here.
      </div>
    );
  }

  return (
    <PlotMap
      plots={plots}
      onPlotClick={(id) => router.push(`/plots/${id}`)}
      className="h-[60vh] min-h-[360px] w-full rounded"
    />
  );
}
