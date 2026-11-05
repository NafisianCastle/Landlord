"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { applyListControls, byName, byNumberDesc, districtsOf } from "@/lib/listControls";

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
  const [district, setDistrict] = useState("");
  const [sort, setSort] = useState("newest");
  const districts = useMemo(() => districtsOf(plots, (p) => p.district), [plots]);

  const filtered = useMemo(
    () =>
      applyListControls(plots, { query, district, sort }, {
        searchable: (p) => [p.name, p.village, p.district],
        districtOf: (p) => p.district,
        sorters: { name: byName, area: byNumberDesc((p) => p.areaSqMeters) },
      }),
    [plots, query, district, sort],
  );

  return (
    <div className="flex flex-col gap-3">
      {plots.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="sm:flex-1"
          />
          {districts.length > 1 && (
            <Select value={district} onValueChange={setDistrict} aria-label={t("filterDistrict")} className="sm:w-44">
              <option value="">{t("allDistricts")}</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          )}
          <Select value={sort} onValueChange={setSort} aria-label={t("sortBy")} className="sm:w-44">
            <option value="newest">{t("sortNewest")}</option>
            <option value="name">{t("sortName")}</option>
            <option value="area">{t("sortArea")}</option>
          </Select>
        </div>
      )}

      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {filtered.map((plot) => (
          <li key={plot.id} className="motion-safe:animate-fade-up">
            <Link
              href={`/plots/${plot.id}`}
              className="flex flex-col p-3 transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
            >
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
