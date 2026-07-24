"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { PlotMapFeature } from "@/components/map/PlotMap";

function MapLoadingFallback() {
  const t = useTranslations("PlotsMapClient");
  return (
    <div className="flex h-[60vh] min-h-[360px] items-center justify-center rounded border bg-neutral-50 text-sm text-neutral-500">
      {t("loadingMap")}
    </div>
  );
}

const PlotMap = dynamic(() => import("@/components/map/PlotMap"), {
  ssr: false,
  loading: () => <MapLoadingFallback />,
});

export default function PlotsMapClient({ plots }: { plots: PlotMapFeature[] }) {
  const router = useRouter();
  const t = useTranslations("PlotsMapClient");

  if (plots.length === 0) {
    return (
      <div className="flex h-[60vh] min-h-[360px] items-center justify-center rounded border bg-neutral-50 text-sm text-neutral-500">
        {t("noBoundaries")}
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
