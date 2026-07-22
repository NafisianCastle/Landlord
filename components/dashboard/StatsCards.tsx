import { convertArea } from "@/lib/units";

interface StatsCardsProps {
  plotCount: number;
  totalAreaSqMeters: number;
  totalPurchasePrice: number;
  totalCurrentValue: number;
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
}: StatsCardsProps) {
  const area = convertArea(totalAreaSqMeters);
  const delta = totalCurrentValue - totalPurchasePrice;
  const deltaPct = totalPurchasePrice > 0 ? (delta / totalPurchasePrice) * 100 : null;

  const cards = [
    { label: "Total plots", value: String(plotCount) },
    {
      label: "Total area",
      value: `${area.decimal.toFixed(2)} decimal`,
      sub: `${area.bigha.toFixed(2)} bigha · ${area.acre.toFixed(3)} acre`,
    },
    { label: "Total purchase price", value: bdt.format(totalPurchasePrice) },
    {
      label: "Total current value",
      value: bdt.format(totalCurrentValue),
      sub:
        deltaPct !== null
          ? `${delta >= 0 ? "+" : ""}${bdt.format(delta)} (${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%)`
          : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded border p-3">
          <p className="text-xs text-neutral-500">{card.label}</p>
          <p className="text-lg font-semibold">{card.value}</p>
          {card.sub && <p className="text-xs text-neutral-600">{card.sub}</p>}
        </div>
      ))}
    </div>
  );
}
