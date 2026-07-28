"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { PlotMapFeature } from "@/components/map/PlotMap";

function MapLoadingFallback() {
  const t = useTranslations("PlotsMapClient");
  return (
    <div className="flex h-[40vh] min-h-[240px] items-center justify-center rounded-lg border border-border bg-muted/40 text-center text-sm text-muted-foreground sm:h-[60vh] sm:min-h-[360px]">
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
      <div className="flex h-[40vh] min-h-[240px] items-center justify-center rounded-lg border border-border bg-muted/40 px-6 text-center text-sm text-muted-foreground sm:h-[60vh] sm:min-h-[360px]">
        {t("noBoundaries")}
      </div>
    );
  }

  return (
    <PlotMap
      plots={plots}
      onPlotClick={(id) => router.push(`/plots/${id}`)}
      className="h-[40vh] min-h-[240px] w-full rounded-lg sm:h-[60vh] sm:min-h-[360px]"
    />
  );
}
