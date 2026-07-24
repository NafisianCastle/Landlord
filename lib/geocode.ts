import type { LatLng } from "./geo";

export interface GeocodeResult {
  label: string;
  center: LatLng;
}

interface PhotonFeature {
  geometry: { type: string; coordinates: [number, number] };
  properties?: {
    name?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
  };
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
  const data: { features?: PhotonFeature[] } = await res.json();

  return (data.features ?? [])
    .filter((f) => f.geometry?.type === "Point")
    .map((f) => {
      const p = f.properties ?? {};
      const label = [p.name, p.city ?? p.county, p.state, p.country]
        .filter(Boolean)
        .join(", ");
      const [lng, lat] = f.geometry.coordinates;
      return { label, center: { lat, lng } };
    });
}
