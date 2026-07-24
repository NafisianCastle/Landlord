import type { LatLng } from "./geo";

export interface GeocodeResult {
  label: string;
  center: LatLng;
}

/**
 * Free, keyless geocoding via Photon (komoot, OSM-based) — same no-signup
 * bar as the map tiles. https://photon.komoot.io
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=5`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Search failed");
  const data = await res.json();

  return (data.features ?? [])
    .filter((f: any) => f.geometry?.type === "Point")
    .map((f: any) => {
      const p = f.properties ?? {};
      const label = [p.name, p.city ?? p.county, p.state, p.country]
        .filter(Boolean)
        .join(", ");
      const [lng, lat] = f.geometry.coordinates;
      return { label, center: { lat, lng } };
    });
}
