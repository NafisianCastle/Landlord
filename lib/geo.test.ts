import { describe, expect, it } from "vitest";
import {
  closedPerimeterMeters,
  googleMapsDirectionsUrl,
  pathLengthMeters,
  pointsToPolygon,
  polygonAreaSqMeters,
  polygonCentroid,
  type LatLng,
} from "./geo";

const square: LatLng[] = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 0.001 },
  { lat: 0.001, lng: 0.001 },
  { lat: 0.001, lng: 0 },
];

describe("pointsToPolygon", () => {
  it("closes an open ring", () => {
    const polygon = pointsToPolygon(square);
    const coords = polygon.coordinates[0];
    expect(coords).toHaveLength(square.length + 1);
    expect(coords[0]).toEqual(coords[coords.length - 1]);
  });

  it("does not duplicate the closing point if already closed", () => {
    const closed = [...square, square[0]];
    const polygon = pointsToPolygon(closed);
    expect(polygon.coordinates[0]).toHaveLength(closed.length);
  });

  it("orders coordinates as [lng, lat]", () => {
    const polygon = pointsToPolygon([{ lat: 10, lng: 20 }, { lat: 30, lng: 40 }]);
    expect(polygon.coordinates[0][0]).toEqual([20, 10]);
  });

  it("throws on empty input (no first point)", () => {
    expect(() => pointsToPolygon([])).toThrow();
  });

  it("handles a single point by not appending a duplicate closing point", () => {
    const polygon = pointsToPolygon([{ lat: 1, lng: 2 }]);
    expect(polygon.coordinates[0]).toHaveLength(1);
  });
});

describe("polygonCentroid", () => {
  it("averages the ring vertices excluding the closing duplicate", () => {
    const polygon = pointsToPolygon(square);
    const centroid = polygonCentroid(polygon);
    expect(centroid.lat).toBeCloseTo(0.0005, 6);
    expect(centroid.lng).toBeCloseTo(0.0005, 6);
  });
});

describe("googleMapsDirectionsUrl", () => {
  it("builds a directions url from lat/lng", () => {
    const url = googleMapsDirectionsUrl({ lat: 23.8, lng: 90.4 });
    expect(url).toBe("https://www.google.com/maps/dir/?api=1&destination=23.8,90.4");
  });

  it("handles negative coordinates", () => {
    const url = googleMapsDirectionsUrl({ lat: -23.8, lng: -90.4 });
    expect(url).toContain("destination=-23.8,-90.4");
  });
});

describe("pathLengthMeters", () => {
  it("returns 0 for fewer than 2 points", () => {
    expect(pathLengthMeters([])).toBe(0);
    expect(pathLengthMeters([{ lat: 0, lng: 0 }])).toBe(0);
  });

  it("returns 0 for two identical points", () => {
    expect(pathLengthMeters([{ lat: 0, lng: 0 }, { lat: 0, lng: 0 }])).toBe(0);
  });

  it("sums consecutive segments without closing the loop", () => {
    const openPath = pathLengthMeters(square);
    const closed = closedPerimeterMeters(square);
    expect(openPath).toBeGreaterThan(0);
    expect(closed).toBeGreaterThan(openPath);
  });

  it("approximates known distance (roughly 111.32km per degree latitude at equator)", () => {
    const oneDegree = pathLengthMeters([{ lat: 0, lng: 0 }, { lat: 1, lng: 0 }]);
    expect(oneDegree).toBeGreaterThan(110_000);
    expect(oneDegree).toBeLessThan(112_000);
  });
});

describe("closedPerimeterMeters", () => {
  it("returns 0 for fewer than 2 points", () => {
    expect(closedPerimeterMeters([])).toBe(0);
    expect(closedPerimeterMeters([{ lat: 0, lng: 0 }])).toBe(0);
  });

  it("adds the closing segment back to the start", () => {
    const twoPoints: LatLng[] = [{ lat: 0, lng: 0 }, { lat: 0, lng: 0.001 }];
    const path = pathLengthMeters(twoPoints);
    const perimeter = closedPerimeterMeters(twoPoints);
    expect(perimeter).toBeCloseTo(path * 2, 0);
  });
});

describe("polygonAreaSqMeters", () => {
  it("returns 0 for fewer than 3 points", () => {
    expect(polygonAreaSqMeters([])).toBe(0);
    expect(polygonAreaSqMeters([{ lat: 0, lng: 0 }])).toBe(0);
    expect(polygonAreaSqMeters([{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }])).toBe(0);
  });

  it("computes a positive area for a valid ring regardless of winding order", () => {
    const cw = polygonAreaSqMeters(square);
    const ccw = polygonAreaSqMeters([...square].reverse());
    expect(cw).toBeGreaterThan(0);
    expect(ccw).toBeCloseTo(cw, 5);
  });

  it("approximates area of a small square via equirectangular projection", () => {
    // ~0.001deg square near equator: side ~111.32m -> area ~12392 m^2
    const area = polygonAreaSqMeters(square);
    expect(area).toBeGreaterThan(10_000);
    expect(area).toBeLessThan(15_000);
  });

  it("returns 0 for degenerate (collinear) points", () => {
    const collinear: LatLng[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 0, lng: 2 },
    ];
    expect(polygonAreaSqMeters(collinear)).toBeCloseTo(0, 6);
  });
});
