"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Feature, FeatureCollection } from "geojson";
import maplibregl from "@/lib/map";
import { styleFor, type BaseStyle } from "@/lib/mapStyles";
import { type LatLng, closedPerimeterMeters, polygonAreaSqMeters } from "@/lib/geo";
import { convertArea } from "@/lib/units";
import { savePlotBoundary } from "@/app/actions/plots";
import { searchPlaces, type GeocodeResult } from "@/lib/geocode";

/**
 * GPS drift can put a walked corner meters off. This mode lets the user drop
 * and drag vertices by eye against satellite/street imagery instead — no
 * device location involved, so accuracy is bounded by the imagery, not GPS.
 */
export default function ManualBoundaryDrawer({ plotId }: { plotId: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [points, setPoints] = useState<LatLng[]>([]);
  const pointsRef = useRef<LatLng[]>([]);
  const draggingIndexRef = useRef<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baseStyle, setBaseStyle] = useState<BaseStyle>("streets");
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: styleFor(baseStyle),
        center: [90.4125, 23.8103],
        zoom: 16,
        maxZoom: 19,
      });
    } catch {
      queueMicrotask(() =>
        setMapError(
          "Map couldn't load — this browser/device doesn't support WebGL, which the map needs.",
        ),
      );
      return;
    }
    mapRef.current = map;

    map.once("load", () => addDrawLayers(map, pointsRef.current));
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: false }), "top-right");
    map.getCanvas().style.cursor = "crosshair";

    navigator.geolocation?.getCurrentPosition(
      (pos) => map.setCenter([pos.coords.longitude, pos.coords.latitude]),
      () => {
        /* ignore — fall back to default center */
      },
      { maximumAge: 60000 },
    );

    // Tap empty map to add a point; tap an existing point to drag it; long
    // press / click-hold isn't distinguished from drag start, so removal of a
    // point is a separate explicit action (double-click) to avoid conflicting
    // with drag gestures.
    map.on("click", (e) => {
      if (draggingIndexRef.current != null) return;
      const hits = map.queryRenderedFeatures(e.point, { layers: ["draw-points"] });
      if (hits.length > 0) return;
      setPoints((prev) => [...prev, { lat: e.lngLat.lat, lng: e.lngLat.lng }]);
    });

    map.on("dblclick", "draw-points", (e) => {
      e.preventDefault();
      const idx = e.features?.[0]?.properties?.index;
      if (typeof idx !== "number") return;
      setPoints((prev) => prev.filter((_, i) => i !== idx));
    });

    map.on("mousedown", "draw-points", (e) => {
      e.preventDefault();
      const idx = e.features?.[0]?.properties?.index;
      if (typeof idx !== "number") return;
      draggingIndexRef.current = idx;
      map.dragPan.disable();
      map.getCanvas().style.cursor = "grabbing";
    });
    map.on("touchstart", "draw-points", (e) => {
      const idx = e.features?.[0]?.properties?.index;
      if (typeof idx !== "number") return;
      e.preventDefault();
      draggingIndexRef.current = idx;
      map.dragPan.disable();
    });

    const onMove = (e: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) => {
      const idx = draggingIndexRef.current;
      if (idx == null) return;
      setPoints((prev) =>
        prev.map((p, i) => (i === idx ? { lat: e.lngLat.lat, lng: e.lngLat.lng } : p)),
      );
    };
    map.on("mousemove", onMove);
    map.on("touchmove", onMove);

    const endDrag = () => {
      if (draggingIndexRef.current == null) return;
      draggingIndexRef.current = null;
      map.dragPan.enable();
      map.getCanvas().style.cursor = "crosshair";
    };
    map.on("mouseup", endDrag);
    map.on("touchend", endDrag);

    map.on("mouseenter", "draw-points", () => {
      if (draggingIndexRef.current == null) map.getCanvas().style.cursor = "grab";
    });
    map.on("mouseleave", "draw-points", () => {
      if (draggingIndexRef.current == null) map.getCanvas().style.cursor = "crosshair";
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    pointsRef.current = points;
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const source = map.getSource("draw") as maplibregl.GeoJSONSource | undefined;
      source?.setData(drawPreview(points));
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [points]);

  useEffect(() => {
    if (searchQuery.trim().length < 3) return;
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchPlaces(searchQuery, controller.signal);
        setSearchResults(results);
      } catch {
        /* aborted or network hiccup — leave prior results */
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  function goToPlace(result: GeocodeResult) {
    mapRef.current?.flyTo({ center: [result.center.lng, result.center.lat], zoom: 17 });
    setSearchQuery(result.label);
    setSearchResults([]);
  }

  function locateMe() {
    const map = mapRef.current;
    if (!map || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 17 });
        setLocating(false);
      },
      () => {
        setError("Couldn't get your location — check location permission.");
        setLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 },
    );
  }

  const stats = useMemo(() => {
    if (points.length < 3) return null;
    return {
      distance: closedPerimeterMeters(points),
      area: convertArea(polygonAreaSqMeters(points)),
    };
  }, [points]);

  function toggleStyle() {
    const map = mapRef.current;
    if (!map) return;
    const next: BaseStyle = baseStyle === "satellite" ? "streets" : "satellite";
    map.setStyle(styleFor(next));
    map.once("style.load", () => addDrawLayers(map, pointsRef.current));
    setBaseStyle(next);
  }

  function undoLast() {
    setPoints((prev) => prev.slice(0, -1));
  }

  function clearAll() {
    if (points.length > 0 && !window.confirm("Clear all points and start over?")) return;
    setPoints([]);
  }

  async function finish() {
    setSaving(true);
    setError(null);
    const result = await savePlotBoundary(plotId, points);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {mapError ? (
        <div className="flex h-[65vh] min-h-[400px] w-full items-center justify-center rounded border border-border bg-card p-4 text-center text-sm text-card-foreground">
          {mapError}
        </div>
      ) : (
        <div className="relative h-[65vh] min-h-[400px] w-full">
          <div ref={containerRef} className="h-full w-full rounded" />
          <div className="absolute left-2 top-2 w-56 max-w-[calc(100%-4.5rem)]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
                if (value.trim().length < 3) {
                  searchAbortRef.current?.abort();
                  setSearchResults([]);
                  setSearching(false);
                }
              }}
              placeholder="Search a place to navigate there..."
              className="w-full rounded bg-card px-2 py-2 text-sm text-card-foreground shadow outline-none"
            />
            {(searching || searchResults.length > 0) && (
              <ul className="mt-1 max-h-48 overflow-y-auto rounded bg-card text-sm text-card-foreground shadow">
                {searching && <li className="px-2 py-2 text-muted-foreground">Searching...</li>}
                {searchResults.map((r, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => goToPlace(r)}
                      className="block w-full px-2 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="absolute right-2 top-32 flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={toggleStyle}
              className="rounded bg-card px-3 py-2 text-xs text-card-foreground shadow"
            >
              {baseStyle === "satellite" ? "Streets" : "Satellite"}
            </button>
          </div>
          <button
            type="button"
            onClick={locateMe}
            disabled={locating}
            title="Return to my location"
            aria-label="Return to my location"
            className="absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-card text-lg text-card-foreground shadow disabled:opacity-50"
          >
            {locating ? "…" : "📍"}
          </button>
          {stats && (
            <div className="absolute bottom-2 left-2 rounded bg-card px-2 py-1 text-xs text-card-foreground shadow">
              {`${stats.distance.toFixed(1)} m perimeter • ${stats.area.decimal.toFixed(2)} decimal (${stats.area.sqMeters.toFixed(0)} m²)`}
            </div>
          )}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Tap the map to drop a corner (4–6 for most plots). Drag a point to reposition it,
        double-tap a point to remove it.
      </p>
      <div className="flex flex-wrap gap-2">
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
          onClick={clearAll}
          disabled={points.length === 0}
          className="rounded border px-3 py-2 disabled:opacity-50"
        >
          Clear all
        </button>
        <button
          type="button"
          onClick={finish}
          disabled={points.length < 3 || saving}
          className="rounded bg-green-600 px-3 py-2 text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : `Save boundary (${points.length} points)`}
        </button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function addDrawLayers(map: maplibregl.Map, points: LatLng[]) {
  for (const id of ["draw-fill", "draw-line", "draw-points-halo", "draw-points"]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (map.getSource("draw")) map.removeSource("draw");
  map.addSource("draw", { type: "geojson", data: drawPreview(points) });
  map.addLayer({
    id: "draw-fill",
    type: "fill",
    source: "draw",
    filter: ["==", "$type", "Polygon"],
    paint: { "fill-color": "#22c55e", "fill-opacity": 0.35 },
  });
  map.addLayer({
    id: "draw-line",
    type: "line",
    source: "draw",
    paint: { "line-color": "#16a34a", "line-width": 3 },
  });
  map.addLayer({
    id: "draw-points-halo",
    type: "circle",
    source: "draw",
    filter: ["==", "$type", "Point"],
    paint: { "circle-color": "#000", "circle-opacity": 0.25, "circle-radius": 12 },
  });
  map.addLayer({
    id: "draw-points",
    type: "circle",
    source: "draw",
    filter: ["==", "$type", "Point"],
    paint: {
      "circle-color": "#fff",
      "circle-radius": 8,
      "circle-stroke-color": "#16a34a",
      "circle-stroke-width": 3,
    },
  });
}

function drawPreview(points: LatLng[]): FeatureCollection {
  const features: Feature[] = points.map((p, index) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [p.lng, p.lat] },
    properties: { index },
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
