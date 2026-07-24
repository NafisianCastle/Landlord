"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { PlotMapFeature } from "@/components/map/PlotMap";

const PlotMap = dynamic(() => import("@/components/map/PlotMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] min-h-[360px] items-center justify-center rounded border bg-neutral-50 text-sm text-neutral-500">
      Loading map…
    </div>
  ),
});

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
