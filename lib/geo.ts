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
