"use client";

import { useTranslations } from "next-intl";
import { convertArea } from "@/lib/units";

interface DistrictStat {
  district: string;
  plotCount: number;
  totalAreaSqMeters: number;
}

export default function LocationBreakdown({ districts }: { districts: DistrictStat[] }) {
  const t = useTranslations("LocationBreakdown");

  if (districts.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noPlots")}</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {districts.map((d) => (
        <li key={d.district} className="flex items-center justify-between px-3 py-2 text-sm">
          <span>{d.district}</span>
          <span className="text-muted-foreground">
            {t("summary", {
              count: d.plotCount,
              area: convertArea(d.totalAreaSqMeters).decimal.toFixed(2),
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}
