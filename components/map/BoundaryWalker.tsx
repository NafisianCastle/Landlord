"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Feature, FeatureCollection } from "geojson";
import maplibregl from "@/lib/map";
import { SATELLITE_STYLE } from "@/lib/mapStyles";
import type { LatLng } from "@/lib/geo";
import {
  resumeOrCreateSession,
  recordPoint,
  undoLastPoint,
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
  const [tileWarning, setTileWarning] = useState<string | null>(null);

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

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: SATELLITE_STYLE,
      center: [90.4125, 23.8103],
      zoom: 16,
      maxZoom: 19,
    });
    mapRef.current = map;

    map.on("error", (e) => {
      const status = (e.error as { status?: number } | undefined)?.status;
      if (status === 404 || status === 204) {
        setTileWarning("Imagery not available at this zoom level here — zoom out a bit.");
      }
    });

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

    map.on("zoom", () => setTileWarning(null));

    let centered = false;
    const el = document.createElement("div");
    el.className = "h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow";
    const marker = new maplibregl.Marker({ element: el });
    locationMarkerRef.current = marker;

    const watchId = navigator.geolocation?.watchPosition(
      (pos) => {
        const lngLat: [number, number] = [pos.coords.longitude, pos.coords.latitude];
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
      <div ref={containerRef} className="h-[65vh] min-h-[400px] w-full rounded" />
      {tileWarning && (
        <p className="rounded bg-amber-50 px-2 py-1 text-sm text-amber-700">{tileWarning}</p>
      )}
      <p className="text-xs text-neutral-500">
        The blue dot is your current GPS position — that&rsquo;s the exact point &ldquo;Mark
        point&rdquo; will record.
      </p>
      {!online && (
        <p className="rounded bg-amber-50 px-2 py-1 text-sm text-amber-700">
          Offline — points are saved on this device and will sync automatically.
        </p>
      )}
      {pending > 0 && (
        <p className="text-sm text-neutral-600">{pending} point(s) waiting to sync.</p>
      )}
      <p className="text-sm text-neutral-600">
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
