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
function orientation(a: LatLng, b: LatLng, c: LatLng): number {
  const v = (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);
  if (Math.abs(v) < 1e-12) return 0;
  return v > 0 ? 1 : -1;
}

function onSegment(a: LatLng, b: LatLng, p: LatLng): boolean {
  return (
    Math.min(a.lng, b.lng) <= p.lng &&
    p.lng <= Math.max(a.lng, b.lng) &&
    Math.min(a.lat, b.lat) <= p.lat &&
    p.lat <= Math.max(a.lat, b.lat)
  );
}

function segmentsIntersect(a1: LatLng, a2: LatLng, b1: LatLng, b2: LatLng): boolean {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);

  if (o1 !== o2 && o3 !== o4) return true;

  if (o1 === 0 && onSegment(a1, a2, b1)) return true;
  if (o2 === 0 && onSegment(a1, a2, b2)) return true;
  if (o3 === 0 && onSegment(b1, b2, a1)) return true;
  if (o4 === 0 && onSegment(b1, b2, a2)) return true;

  return false;
}

/**
 * True if the closed ring described by `points` has no self-intersecting or
 * overlapping edges. Only non-adjacent edge pairs are checked — adjacent
 * edges always share an endpoint and would otherwise register a false hit.
 */
export function isSimplePolygon(points: LatLng[]): boolean {
  const n = points.length;
  if (n < 3) return true;
  const edges: [LatLng, LatLng][] = points.map((p, i) => [p, points[(i + 1) % n]]);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacent) continue;
      if (segmentsIntersect(edges[i][0], edges[i][1], edges[j][0], edges[j][1])) return false;
    }
  }
  return true;
}

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
