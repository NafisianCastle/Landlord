import type { LatLng } from "@/lib/geo";

export function validBoundaryPoints(value: unknown): value is LatLng[] {
  return Array.isArray(value) && value.length >= 3 && value.length <= 2000 &&
    value.every(p => p && typeof p === "object" && typeof p.lat === "number" &&
      typeof p.lng === "number" && Number.isFinite(p.lat) && Number.isFinite(p.lng) &&
      p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180);
}
