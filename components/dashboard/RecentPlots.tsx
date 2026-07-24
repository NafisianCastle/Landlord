import Link from "next/link";

interface RecentPlot {
  id: string;
  name: string;
  village: string | null;
  district: string | null;
  areaSqMeters: number | null;
}

export default function RecentPlots({ plots }: { plots: RecentPlot[] }) {
  if (plots.length === 0) {
    return <p className="text-sm text-muted-foreground">No plots yet.</p>;
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
              {[plot.village, plot.district].filter(Boolean).join(", ") || "No location set"}
              {plot.areaSqMeters ? ` · ${plot.areaSqMeters.toFixed(0)} m²` : " · boundary not walked yet"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
