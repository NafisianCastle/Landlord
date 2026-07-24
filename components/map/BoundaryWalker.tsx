"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Feature, FeatureCollection } from "geojson";
import maplibregl from "@/lib/map";
import { styleFor, type BaseStyle } from "@/lib/mapStyles";
import {
  type LatLng,
  pathLengthMeters,
  closedPerimeterMeters,
  polygonAreaSqMeters,
} from "@/lib/geo";
import { convertArea } from "@/lib/units";
import {
  resumeOrCreateSession,
  recordPoint,
  undoLastPoint,
  deletePointAt,
  finishSession,
  pendingCount,
  onSyncStateChange,
} from "@/lib/offline/syncQueue";

// Points are written to IndexedDB (via lib/offline/syncQueue) before touching
// the network, so a crash, tab close, or zero-signal stretch mid-walk never
// loses a tap — the walk resumes from local storage on next visit, and
// pending points sync out once connectivity returns.
export default function BoundaryWalker({ plotId }: { plotId: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [points, setPoints] = useState<LatLng[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );
  const locationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const pointsRef = useRef<LatLng[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const currentLocationRef = useRef<[number, number] | null>(null);
  const [tileWarning, setTileWarning] = useState<string | null>(null);
  const [baseStyle, setBaseStyle] = useState<BaseStyle>("streets");
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    resumeOrCreateSession(plotId).then(({ session, points: existing }) => {
      setSessionId(session.id);
      setPoints(existing.map((p) => ({ lat: p.lat, lng: p.lng })));
    });
  }, [plotId]);

  useEffect(() => {
    const refreshPending = () => {
      pendingCount(plotId).then(setPending);
    };
    refreshPending();
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const unsubscribe = onSyncStateChange(refreshPending);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
    };
  }, [plotId]);

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

    map.on("error", (e) => {
      const err = e.error as { status?: number; type?: string } | undefined;
      if (err?.status === 404 || err?.status === 204) {
        setTileWarning("Imagery not available at this zoom level here — zoom out a bit.");
      } else if (err?.type === "webglcontextcreationerror" || err?.type === "webglcontextlost") {
        setMapError(
          "Map couldn't load — this browser/device doesn't support WebGL, which the map needs.",
        );
      }
    });

    map.once("load", () => addWalkLayers(map, pointsRef.current));

    map.on("zoom", () => setTileWarning(null));

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

    map.on("click", "walk-points", async (e) => {
      const idx = e.features?.[0]?.properties?.index;
      const sid = sessionIdRef.current;
      if (typeof idx !== "number" || !sid) return;
      if (!window.confirm("Remove this point from the boundary?")) return;
      await deletePointAt(sid, idx);
      setPoints((prev) => prev.filter((_, i) => i !== idx));
    });
    map.on("mouseenter", "walk-points", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "walk-points", () => {
      map.getCanvas().style.cursor = "";
    });

    let centered = false;
    const el = document.createElement("div");
    el.className = "h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow";
    const marker = new maplibregl.Marker({ element: el });
    locationMarkerRef.current = marker;

    const watchId = navigator.geolocation?.watchPosition(
      (pos) => {
        const lngLat: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        currentLocationRef.current = lngLat;
        marker.setLngLat(lngLat).addTo(map);
        if (!centered) {
          map.setCenter(lngLat);
          centered = true;
        }
      },
      () => {
        /* ignore — GPS may be briefly unavailable indoors/underground */
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );

    return () => {
      if (watchId != null) navigator.geolocation?.clearWatch(watchId);
      marker.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    pointsRef.current = points;
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const source = map.getSource("walk") as maplibregl.GeoJSONSource | undefined;
      source?.setData(walkPreview(points));
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [points]);

  const stats = useMemo(() => {
    if (points.length < 2) return null;
    if (points.length < 3) {
      return { distance: pathLengthMeters(points), area: null };
    }
    return {
      distance: closedPerimeterMeters(points),
      area: convertArea(polygonAreaSqMeters(points)),
    };
  }, [points]);

  function recenter() {
    const map = mapRef.current;
    if (!map || !currentLocationRef.current) return;
    map.setCenter(currentLocationRef.current);
  }

  function toggleStyle() {
    const map = mapRef.current;
    if (!map) return;
    const next: BaseStyle = baseStyle === "satellite" ? "streets" : "satellite";
    map.setStyle(styleFor(next));
    map.once("style.load", () => addWalkLayers(map, pointsRef.current));
    setBaseStyle(next);
  }

  function markPoint() {
    if (!sessionId) return;
    if (!navigator.geolocation) {
      setError("Geolocation is not available on this device/browser.");
      return;
    }
    setCapturing(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        await recordPoint(
          sessionId,
          plotId,
          points.length,
          point.lat,
          point.lng,
          pos.coords.accuracy ?? null,
        );
        setPoints((prev) => [...prev, point]);
        setCapturing(false);
      },
      (err) => {
        setError(err.message);
        setCapturing(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function undoLast() {
    if (!sessionId) return;
    await undoLastPoint(sessionId);
    setPoints((prev) => prev.slice(0, -1));
  }

  async function finish() {
    if (!sessionId) return;
    setSaving(true);
    setError(null);
    setQueuedMessage(null);
    const { finished } = await finishSession(plotId, sessionId);
    setSaving(false);
    if (finished.includes(plotId)) {
      router.refresh();
    } else {
      setQueuedMessage(
        "Saved on this device — will finish syncing once you're back online.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {mapError ? (
        <div className="flex h-[65vh] min-h-[400px] w-full items-center justify-center rounded border border-border bg-card p-4 text-center text-sm text-card-foreground">
          {mapError} You can still mark points below — they&rsquo;ll save without a map
          preview.
        </div>
      ) : (
        <div className="relative h-[65vh] min-h-[400px] w-full">
          <div ref={containerRef} className="h-full w-full rounded" />
          <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={toggleStyle}
              className="rounded bg-card px-3 py-2 text-xs text-card-foreground shadow"
            >
              {baseStyle === "satellite" ? "Streets" : "Satellite"}
            </button>
            <button
              type="button"
              onClick={recenter}
              className="rounded bg-card px-3 py-2 text-xs text-card-foreground shadow"
            >
              Recenter on me
            </button>
          </div>
          {stats && (
            <div className="absolute bottom-2 left-2 rounded bg-card px-2 py-1 text-xs text-card-foreground shadow">
              {points.length < 3
                ? `${stats.distance.toFixed(1)} m walked so far`
                : `${stats.distance.toFixed(1)} m perimeter • ${stats.area!.decimal.toFixed(2)} decimal (${stats.area!.sqMeters.toFixed(0)} m²)`}
            </div>
          )}
        </div>
      )}
      {tileWarning && (
        <p className="rounded bg-amber-50 px-2 py-1 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">{tileWarning}</p>
      )}
      <p className="text-xs text-muted-foreground">
        The blue dot is your current GPS position — that&rsquo;s the exact point &ldquo;Mark
        point&rdquo; will record. Tap a marked point on the map to remove just that one.
      </p>
      {!online && (
        <p className="rounded bg-amber-50 px-2 py-1 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Offline — points are saved on this device and will sync automatically.
        </p>
      )}
      {pending > 0 && (
        <p className="text-sm text-muted-foreground">{pending} point(s) waiting to sync.</p>
      )}
      <p className="text-sm text-muted-foreground">
        Walk the boundary of the plot. Tap &ldquo;Mark point&rdquo; at each corner as you go.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={markPoint}
          disabled={capturing || !sessionId}
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
      {queuedMessage && <p className="text-sm text-amber-700">{queuedMessage}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function addWalkLayers(map: maplibregl.Map, points: LatLng[]) {
  map.addSource("walk", { type: "geojson", data: walkPreview(points) });
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
}

function walkPreview(points: LatLng[]): FeatureCollection {
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
