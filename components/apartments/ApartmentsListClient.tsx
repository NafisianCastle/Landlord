"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { applyListControls, byName, districtsOf } from "@/lib/listControls";

export interface ApartmentListItem {
  id: string;
  name: string;
  district: string | null;
  upazila: string | null;
  size: number | null;
  sizeUnit: string | null;
  shared?: boolean;
}

export default function ApartmentsListClient({ apartments }: { apartments: ApartmentListItem[] }) {
  const t = useTranslations("ApartmentsPage");
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("");
  const [sort, setSort] = useState("newest");
  const districts = useMemo(() => districtsOf(apartments, (a) => a.district), [apartments]);

  const filtered = useMemo(
    () =>
      applyListControls(apartments, { query, district, sort }, {
        searchable: (a) => [a.name, a.upazila, a.district],
        districtOf: (a) => a.district,
        // Sizes use different units, so there's no size sort.
        sorters: { name: byName },
      }),
    [apartments, query, district, sort],
  );

  return (
    <div className="flex flex-col gap-3">
      {apartments.length > 0 && (
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
          </Select>
        </div>
      )}

      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {filtered.map((apartment) => (
          <li key={apartment.id} className="motion-safe:animate-fade-up">
            <Link
              href={`/apartments/${apartment.id}`}
              className="flex flex-col p-3 transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
            >
              <span className="flex items-center gap-2 font-medium">
                {apartment.name}
                {apartment.shared && <Badge>{t("sharedBadge")}</Badge>}
              </span>
              <span className="text-sm text-muted-foreground">
                {[apartment.upazila, apartment.district].filter(Boolean).join(", ") ||
                  t("noLocationSet")}
                {apartment.size
                  ? ` · ${apartment.size} ${apartment.sizeUnit ?? ""}`
                  : ` · ${t("sizeNotSet")}`}
              </span>
            </Link>
          </li>
        ))}
        {apartments.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">{t("noApartmentsYet")}</li>
        )}
        {apartments.length > 0 && filtered.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">{t("noSearchResults")}</li>
        )}
      </ul>
    </div>
  );
}
