"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return apartments;
    return apartments.filter((a) =>
      [a.name, a.upazila, a.district].some((field) => field?.toLowerCase().includes(q)),
    );
  }, [apartments, query]);

  return (
    <div className="flex flex-col gap-3">
      {apartments.length > 0 && (
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
        />
      )}

      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {filtered.map((apartment) => (
          <li key={apartment.id} className="p-3">
            <Link href={`/apartments/${apartment.id}`} className="flex flex-col">
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
