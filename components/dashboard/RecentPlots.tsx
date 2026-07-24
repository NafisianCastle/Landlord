"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

interface RecentPlot {
  id: string;
  name: string;
  village: string | null;
  district: string | null;
  areaSqMeters: number | null;
}

export default function RecentPlots({ plots }: { plots: RecentPlot[] }) {
  const t = useTranslations("RecentPlots");

  if (plots.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noPlots")}</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {plots.map((plot) => (
        <li key={plot.id}>
          <Link
            href={`/plots/${plot.id}`}
            className="flex flex-col px-3 py-2 hover:bg-secondary"
          >
            <span className="text-sm font-medium">{plot.name}</span>
            <span className="text-xs text-muted-foreground">
              {[plot.village, plot.district].filter(Boolean).join(", ") || t("noLocationSet")}
              {plot.areaSqMeters
                ? ` · ${t("areaValue", { area: plot.areaSqMeters.toFixed(0) })}`
                : ` · ${t("boundaryNotWalked")}`}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
