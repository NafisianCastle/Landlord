import { validateProperty, propertyRules } from "./forms";
import { validBoundaryPoints } from "./geometry";
import { isSimplePolygon } from "@/lib/geo";

/** Validate the entire batch before writing anything, including direct action calls. */
export function validateGuestProperties(items: unknown): string | null {
  if (!Array.isArray(items) || items.length > 100) return "Import at most 100 properties at a time.";
  for (const item of items) {
    if (!item || typeof item !== "object") return "Invalid imported property.";
    const form = new FormData();
    for (const key of Object.keys(propertyRules)) {
      const value = item[key];
      if (value == null) continue;
      if (typeof value !== "string" && typeof value !== "number") return "Invalid imported property field.";
      form.set(key, String(value));
    }
    const error = validateProperty(form);
    if (error) return error;
    if (item.boundaryGeojson != null) {
      const polygon = item.boundaryGeojson;
      if (polygon.type !== "Polygon" || !Array.isArray(polygon.coordinates) || polygon.coordinates.length !== 1) return "Invalid imported boundary.";
      const ring = polygon.coordinates[0];
      if (!Array.isArray(ring) || ring.length < 4 || ring.length > 2001 ||
          !ring.every((p: unknown) => Array.isArray(p) && p.length === 2)) return "Invalid imported boundary.";
      if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) return "Invalid imported boundary.";
      const points = ring.slice(0, -1).map(([lng, lat]: number[]) => ({ lng, lat }));
      if (!validBoundaryPoints(points) || !isSimplePolygon(points)) return "Invalid imported boundary.";
    }
  }
  return null;
}
