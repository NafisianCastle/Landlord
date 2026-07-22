import { convertArea } from "@/lib/units";

interface DistrictStat {
  district: string;
  plotCount: number;
  totalAreaSqMeters: number;
}

export default function LocationBreakdown({ districts }: { districts: DistrictStat[] }) {
  if (districts.length === 0) {
    return <p className="text-sm text-neutral-600">No plots yet.</p>;
  }

  return (
    <ul className="divide-y rounded border">
      {districts.map((d) => (
        <li key={d.district} className="flex items-center justify-between px-3 py-2 text-sm">
          <span>{d.district}</span>
          <span className="text-neutral-600">
            {d.plotCount} plot{d.plotCount === 1 ? "" : "s"} ·{" "}
            {convertArea(d.totalAreaSqMeters).decimal.toFixed(2)} decimal
          </span>
        </li>
      ))}
    </ul>
  );
}
