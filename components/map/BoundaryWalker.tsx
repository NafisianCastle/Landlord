"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Feature, FeatureCollection } from "geojson";
import maplibregl from "@/lib/map";
import { SATELLITE_STYLE } from "@/lib/mapStyles";
import type { LatLng } from "@/lib/geo";
import { savePlotBoundary } from "@/app/actions/plots";

// Phase 1: points live only in React state — a page reload mid-walk loses
// them. Phase 2 adds a Dexie-backed queue underneath so taps survive a crash
// and zero-signal stretches while walking a village boundary.
export default function BoundaryWalker({ plotId }: { plotId: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [points, setPoints] = useState<LatLng[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: SATELLITE_STYLE,
      center: [90.4125, 23.8103],
      zoom: 16,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("walk", { type: "geojson", data: emptyCollection() });
      map.addLayer({
        id: "walk-fill",
        type: "fill",
        source: "walk",
        filter: ["==", "$type", "Polygon"],
        paint: { "fill-color": "#22c55e", "fill-opacity": 0.35 },
      });
      map.addLayer({
        id: "walk-line",
        type: "line",
        source: "walk",
        paint: { "line-color": "#16a34a", "line-width": 3 },
      });
      map.addLayer({
        id: "walk-points",
        type: "circle",
        source: "walk",
        filter: ["==", "$type", "Point"],
        paint: { "circle-color": "#16a34a", "circle-radius": 5 },
      });
    });

    navigator.geolocation?.getCurrentPosition((pos) => {
      map.setCenter([pos.coords.longitude, pos.coords.latitude]);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const source = map.getSource("walk") as maplibregl.GeoJSONSource | undefined;
      source?.setData(walkPreview(points));
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [points]);

  function markPoint() {
    if (!navigator.geolocation) {
      setError("Geolocation is not available on this device/browser.");
      return;
    }
    setCapturing(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPoints((prev) => [
          ...prev,
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
        ]);
        setCapturing(false);
      },
      (err) => {
        setError(err.message);
        setCapturing(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function undoLast() {
    setPoints((prev) => prev.slice(0, -1));
  }

  async function finish() {
    setSaving(true);
    setError(null);
    const result = await savePlotBoundary(plotId, points);
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={containerRef} className="h-80 w-full rounded" />
      <p className="text-sm text-neutral-600">
        Walk the boundary of the plot. Tap &ldquo;Mark point&rdquo; at each corner as you go.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={markPoint}
          disabled={capturing}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {capturing ? "Getting location..." : "Mark point"}
        </button>
        <button
          type="button"
          onClick={undoLast}
          disabled={points.length === 0}
          className="rounded border px-3 py-2 disabled:opacity-50"
        >
          Undo last
        </button>
        <button
          type="button"
          onClick={finish}
          disabled={points.length < 3 || saving}
          className="rounded bg-green-600 px-3 py-2 text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : `Finish (${points.length} points)`}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function emptyCollection(): FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function walkPreview(points: LatLng[]): FeatureCollection {
  const features: Feature[] = points.map((p) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [p.lng, p.lat] },
    properties: {},
  }));

  if (points.length >= 2) {
    const coords = points.map((p) => [p.lng, p.lat]);
    if (points.length >= 3) {
      features.push({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[...coords, coords[0]]] },
        properties: {},
      });
    } else {
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: coords },
        properties: {},
      });
    }
  }

  return { type: "FeatureCollection", features };
}
