import Link from "next/link";
import type { Polygon } from "geojson";
import { createClient } from "@/lib/supabase/server";
import PlotsMapClient from "./PlotsMapClient";

export default async function PlotsPage() {
  const supabase = await createClient();
  const { data: plots } = await supabase
    .from("land_plots")
    .select("id, name, village, district, area_sq_meters, boundary_geojson")
    .order("created_at", { ascending: false });

  const mapped = (plots ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    village: p.village,
    district: p.district,
    areaSqMeters: p.area_sq_meters,
    boundary: p.boundary_geojson as Polygon | null,
  }));

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your plots</h1>
        <Link
          href="/plots/new"
          className="rounded bg-black px-3 py-2 text-sm text-white"
        >
          Add plot
        </Link>
      </div>

      <PlotsMapClient
        plots={mapped.filter(
          (p): p is typeof p & { boundary: Polygon } => p.boundary !== null,
        )}
      />

      <ul className="flex flex-col divide-y rounded border">
        {mapped.map((plot) => (
          <li key={plot.id} className="p-3">
            <Link href={`/plots/${plot.id}`} className="flex flex-col">
              <span className="font-medium">{plot.name}</span>
              <span className="text-sm text-neutral-600">
                {[plot.village, plot.district].filter(Boolean).join(", ") ||
                  "No location set"}
                {plot.areaSqMeters
                  ? ` · ${plot.areaSqMeters.toFixed(0)} m²`
                  : " · boundary not walked yet"}
              </span>
            </Link>
          </li>
        ))}
        {mapped.length === 0 && (
          <li className="p-3 text-sm text-neutral-600">
            No plots yet. Add your first one.
          </li>
        )}
      </ul>
    </div>
  );
}
