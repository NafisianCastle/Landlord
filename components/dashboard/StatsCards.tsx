"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { convertArea } from "@/lib/units";
import { useCountUp } from "@/lib/hooks/useCountUp";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardsProps {
  plotCount: number;
  totalAreaSqMeters: number;
  totalPurchasePrice: number;
  totalCurrentValue: number;
  documentCount: number;
  apartmentCount?: number;
  /** Where the purchase/current value cards lead; guests can't open analytics. */
  valueHref?: string;
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
  valueHref = "/analytics",
}: StatsCardsProps) {
  const t = useTranslations("StatsCards");
  const area = convertArea(totalAreaSqMeters);
  const delta = totalCurrentValue - totalPurchasePrice;
  const deltaPct = totalPurchasePrice > 0 ? (delta / totalPurchasePrice) * 100 : null;

  const count = (n: number) => String(Math.round(n));
  const money = (n: number) => bdt.format(Math.round(n));

  const cards: StatCardProps[] = [
    { label: t("totalPlots"), href: "/plots", amount: plotCount, format: count },
    ...(apartmentCount !== undefined
      ? [{ label: t("totalApartments"), href: "/apartments", amount: apartmentCount, format: count }]
      : []),
    {
      label: t("totalArea"),
      href: "/plots",
      amount: area.decimal,
      format: (n) => t("decimalValue", { value: n.toFixed(2) }),
      sub: t("areaSub", { bigha: area.bigha.toFixed(2), acre: area.acre.toFixed(3) }),
    },
    { label: t("totalPurchasePrice"), href: valueHref, amount: totalPurchasePrice, format: money },
    {
      label: t("totalCurrentValue"),
      href: valueHref,
      amount: totalCurrentValue,
      format: money,
      sub:
        deltaPct !== null
          ? `${delta >= 0 ? "+" : ""}${bdt.format(delta)} (${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%)`
          : undefined,
    },
    { label: t("documents"), href: "/plots", amount: documentCount, format: count },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}

interface StatCardProps {
  label: string;
  href: string;
  amount: number;
  format: (n: number) => string;
  sub?: string;
}

function StatCard({ label, href, amount, format, sub }: StatCardProps) {
  const shown = useCountUp(amount);
  return (
    <Link
      href={href}
      className="group min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full min-w-0 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
        <CardContent className="min-w-0 p-3">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-semibold tabular-nums">{format(shown)}</p>
          {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}
