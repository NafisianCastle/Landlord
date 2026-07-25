import type { Polygon } from "geojson";

export interface LatLng {
  lat: number;
  lng: number;
}

/** Closes the ring and builds a GeoJSON Polygon from walked points, in [lng, lat] order. */
export function pointsToPolygon(points: LatLng[]): Polygon {
  const ring = points.map((p) => [p.lng, p.lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push(first);
  }
  return { type: "Polygon", coordinates: [ring] };
}

/** Simple average of ring vertices — good enough for a map-navigation pin, not a true geometric centroid. */
export function polygonCentroid(polygon: Polygon): LatLng {
  const ring = polygon.coordinates[0].slice(0, -1);
  const sum = ring.reduce(
    (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
    { lng: 0, lat: 0 },
  );
  return { lng: sum.lng / ring.length, lat: sum.lat / ring.length };
}

export function googleMapsDirectionsUrl(destination: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
}

const EARTH_RADIUS_M = 6371000;

function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Sum of consecutive-segment distances (meters), not closing the loop. */
export function pathLengthMeters(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMeters(points[i - 1], points[i]);
  }
  return total;
}

/** Perimeter (meters) as if the ring were closed now — path length plus the closing segment. */
export function closedPerimeterMeters(points: LatLng[]): number {
  if (points.length < 2) return 0;
  return pathLengthMeters(points) + haversineMeters(points[points.length - 1], points[0]);
}

/**
 * Approximate geodesic area (m²) via equirectangular projection centered on
 * the ring's mean latitude — accurate enough for plot-sized areas (tens to
 * low thousands of m²), not meant for large/planet-scale polygons.
 */
export function polygonAreaSqMeters(points: LatLng[]): number {
  if (points.length < 3) return 0;
  const meanLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const latRad = (meanLat * Math.PI) / 180;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(latRad);
  const projected = points.map((p) => ({ x: p.lng * mPerDegLng, y: p.lat * mPerDegLat }));
  let area = 0;
  for (let i = 0; i < projected.length; i++) {
    const j = (i + 1) % projected.length;
    area += projected[i].x * projected[j].y - projected[j].x * projected[i].y;
  }
  return Math.abs(area) / 2;
}
