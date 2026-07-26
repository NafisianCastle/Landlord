"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface PlotListItem {
  id: string;
  name: string;
  village: string | null;
  district: string | null;
  areaSqMeters: number | null;
  shared?: boolean;
}

export default function PlotsListClient({ plots }: { plots: PlotListItem[] }) {
  const t = useTranslations("PlotsPage");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plots;
    return plots.filter((p) =>
      [p.name, p.village, p.district].some((field) => field?.toLowerCase().includes(q)),
    );
  }, [plots, query]);

  return (
    <div className="flex flex-col gap-3">
      {plots.length > 0 && (
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
        />
      )}

      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {filtered.map((plot) => (
          <li key={plot.id} className="p-3">
            <Link href={`/plots/${plot.id}`} className="flex flex-col">
              <span className="flex items-center gap-2 font-medium">
                {plot.name}
                {plot.shared && <Badge>{t("sharedBadge")}</Badge>}
              </span>
              <span className="text-sm text-muted-foreground">
                {[plot.village, plot.district].filter(Boolean).join(", ") || t("noLocationSet")}
                {plot.areaSqMeters
                  ? ` · ${t("areaValue", { area: plot.areaSqMeters.toFixed(0) })}`
                  : ` · ${t("boundaryNotWalked")}`}
              </span>
            </Link>
          </li>
        ))}
        {plots.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">{t("noPlotsYet")}</li>
        )}
        {plots.length > 0 && filtered.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">{t("noSearchResults")}</li>
        )}
      </ul>
    </div>
  );
}
