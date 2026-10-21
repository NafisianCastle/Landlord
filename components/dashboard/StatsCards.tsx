"use client";

import { useTranslations } from "next-intl";
import { convertArea } from "@/lib/units";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardsProps {
  plotCount: number;
  totalAreaSqMeters: number;
  totalPurchasePrice: number;
  totalCurrentValue: number;
  documentCount: number;
  apartmentCount?: number;
}

const bdt = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

export default function StatsCards({
  plotCount,
  totalAreaSqMeters,
  totalPurchasePrice,
  totalCurrentValue,
  documentCount,
  apartmentCount,
}: StatsCardsProps) {
  const t = useTranslations("StatsCards");
  const area = convertArea(totalAreaSqMeters);
  const delta = totalCurrentValue - totalPurchasePrice;
  const deltaPct = totalPurchasePrice > 0 ? (delta / totalPurchasePrice) * 100 : null;

  const cards = [
    { label: t("totalPlots"), value: String(plotCount) },
    ...(apartmentCount !== undefined
      ? [{ label: t("totalApartments"), value: String(apartmentCount) }]
      : []),
    {
      label: t("totalArea"),
      value: t("decimalValue", { value: area.decimal.toFixed(2) }),
      sub: t("areaSub", { bigha: area.bigha.toFixed(2), acre: area.acre.toFixed(3) }),
    },
    { label: t("totalPurchasePrice"), value: bdt.format(totalPurchasePrice) },
    {
      label: t("totalCurrentValue"),
      value: bdt.format(totalCurrentValue),
      sub:
        deltaPct !== null
          ? `${delta >= 0 ? "+" : ""}${bdt.format(delta)} (${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%)`
          : undefined,
    },
    { label: t("documents"), value: String(documentCount) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.label} className="min-w-0">
          <CardContent className="min-w-0 p-3">
            <p className="truncate text-xs text-muted-foreground">{card.label}</p>
            <p className="truncate text-lg font-semibold">{card.value}</p>
            {card.sub && <p className="truncate text-xs text-muted-foreground">{card.sub}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
