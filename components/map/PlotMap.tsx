"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { FeatureCollection, Polygon } from "geojson";
import maplibregl from "@/lib/map";
import { styleFor, type BaseStyle } from "@/lib/mapStyles";
import db, { type OfflineArea } from "@/lib/offline/db";
import {
  downloadArea,
  deleteArea,
  estimateTileCount,
  AreaTooLargeError,
  type DownloadProgress,
} from "@/lib/offline/tileDownload";

export interface PlotMapFeature {
  id: string;
  name: string;
  boundary: Polygon;
}

interface PlotMapProps {
  plots: PlotMapFeature[];
  onPlotClick?: (plotId: string) => void;
  className?: string;
}

export default function PlotMap({ plots, onPlotClick, className }: PlotMapProps) {
  const t = useTranslations("PlotMap");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const [baseStyle, setBaseStyle] = useState<BaseStyle>("streets");
  const [tileWarning, setTileWarning] = useState<string | null>(null);
  const [areas, setAreas] = useState<OfflineArea[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    db.offlineAreas.orderBy("downloadedAt").reverse().toArray().then(setAreas);
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: styleFor(baseStyle),
        center: [90.4125, 23.8103], // Dhaka, sensible default before plots load
        zoom: 6,
        maxZoom: 19,
      });
    } catch {
      queueMicrotask(() => setMapError(t("webglError")));
      return;
    }
    mapRef.current = map;

    map.on("error", (e) => {
      const err = e.error as { status?: number; type?: string } | undefined;
      if (err?.status === 404 || err?.status === 204) {
        setTileWarning(t("imageryUnavailable"));
      } else if (err?.type === "webglcontextcreationerror" || err?.type === "webglcontextlost") {
        setMapError(t("webglError"));
      }
    });
    map.on("zoom", () => setTileWarning(null));
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

    const attachLayers = () => {
      addPlotLayers(map, plots);
      map.on("click", "plots-fill", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id && onPlotClick) onPlotClick(id);
      });
      map.on("mouseenter", "plots-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "plots-fill", () => {
        map.getCanvas().style.cursor = "";
      });
      readyRef.current = true;
      fitToPlots(map, plots);
    };

    map.once("load", attachLayers);

    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const source = map.getSource("plots") as maplibregl.GeoJSONSource | undefined;
    source?.setData(featureCollection(plots));
    fitToPlots(map, plots);
  }, [plots]);

  async function handleDownload() {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    const bounds = {
      west: b.getWest(),
      south: b.getSouth(),
      east: b.getEast(),
      north: b.getNorth(),
    };
    const minZoom = Math.max(0, Math.floor(map.getZoom()));
    const maxZoom = Math.min(19, minZoom + 3);

    const controller = new AbortController();
    abortRef.current = controller;
    setDownloadError(null);
    setDownloading(true);
    setProgress({ done: 0, total: estimateTileCount(bounds, minZoom, maxZoom) });

    try {
      const { tileCount, bytesStored } = await downloadArea(
        bounds,
        minZoom,
        maxZoom,
        setProgress,
        controller.signal,
      );
      const area: OfflineArea = {
        id: crypto.randomUUID(),
        label: t("areaDownloadedLabel", { date: new Date().toLocaleDateString() }),
        ...bounds,
        minZoom,
        maxZoom,
        tileCount,
        bytesStored,
        downloadedAt: Date.now(),
      };
      await db.offlineAreas.add(area);
      setAreas((prev) => [area, ...prev]);
    } catch (err) {
      if (err instanceof AreaTooLargeError) {
        setDownloadError(err.message);
      } else if ((err as Error).name !== "AbortError") {
        setDownloadError(t("downloadFailed"));
      }
    } finally {
      setDownloading(false);
      setProgress(null);
      abortRef.current = null;
    }
  }

  function cancelDownload() {
    abortRef.current?.abort();
  }

  async function removeArea(area: OfflineArea) {
    await deleteArea(area, area.minZoom, area.maxZoom);
    await db.offlineAreas.delete(area.id);
    setAreas((prev) => prev.filter((a) => a.id !== area.id));
  }

  function goToArea(area: OfflineArea) {
    mapRef.current?.fitBounds(
      [
        [area.west, area.south],
        [area.east, area.north],
      ],
      { padding: 24 },
    );
  }

  function toggleStyle() {
    const map = mapRef.current;
    if (!map) return;
    const next: BaseStyle = baseStyle === "satellite" ? "streets" : "satellite";
    readyRef.current = false;
    map.setStyle(styleFor(next));
    map.once("style.load", () => {
      addPlotLayers(map, plots);
      readyRef.current = true;
    });
    setBaseStyle(next);
  }

  if (mapError) {
    return (
      <div
        className={`flex items-center justify-center rounded border border-border bg-card p-4 text-center text-sm text-card-foreground ${className ?? "h-full w-full"}`}
      >
        {mapError}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className={`relative ${className ?? "h-full w-full"}`}>
        <div ref={containerRef} className="h-full w-full" />
        {tileWarning && (
          <p className="absolute bottom-2 left-2 right-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800 shadow dark:bg-amber-950 dark:text-amber-300">
            {tileWarning}
          </p>
        )}
        {downloading && progress && (
          <div className="absolute bottom-2 left-2 right-2 rounded bg-card px-2 py-1 text-xs text-card-foreground shadow">
            <div className="flex items-center justify-between gap-2">
              <span>{t("downloadingTiles", { done: progress.done, total: progress.total })}</span>
              <button
                type="button"
                onClick={cancelDownload}
                className="rounded px-2 py-1 underline"
              >
                {t("cancel")}
              </button>
            </div>
            <div className="mt-1 h-1 w-full rounded bg-neutral-200 dark:bg-neutral-700">
              <div
                className="h-1 rounded bg-green-600"
                style={{
                  width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}
        <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={toggleStyle}
            className="rounded bg-card px-3 py-2 text-xs text-card-foreground shadow"
          >
            {baseStyle === "satellite" ? t("streets") : t("satellite")}
          </button>
          {baseStyle === "satellite" && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="rounded bg-card px-3 py-2 text-xs text-card-foreground shadow disabled:opacity-50"
            >
              {t("downloadOffline")}
            </button>
          )}
        </div>
      </div>
      {downloadError && <p className="text-xs text-destructive">{downloadError}</p>}
      {baseStyle !== "satellite" && (
        <p className="text-xs text-muted-foreground">{t("offlineDownloadHint")}</p>
      )}
      {areas.length > 0 && (
        <div className="rounded border border-border p-2 text-xs">
          <p className="mb-1 font-medium text-foreground">{t("downloadedForOffline")}</p>
          <ul className="flex flex-col gap-1">
            {areas.map((area) => (
              <li key={area.id} className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => goToArea(area)}
                  className="rounded py-1 text-left underline"
                >
                  {t("areaSummary", {
                    label: area.label,
                    mb: (area.bytesStored / 1024 / 1024).toFixed(1),
                    tiles: area.tileCount,
                  })}
                </button>
                <button
                  type="button"
                  onClick={() => removeArea(area)}
                  className="shrink-0 rounded px-2 py-1.5 text-destructive underline"
                >
                  {t("delete")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function addPlotLayers(map: maplibregl.Map, plots: PlotMapFeature[]) {
  if (map.getLayer("plots-fill")) map.removeLayer("plots-fill");
  if (map.getLayer("plots-outline")) map.removeLayer("plots-outline");
  if (map.getSource("plots")) map.removeSource("plots");
  map.addSource("plots", { type: "geojson", data: featureCollection(plots) });
  map.addLayer({
    id: "plots-fill",
    type: "fill",
    source: "plots",
    paint: { "fill-color": "#22c55e", "fill-opacity": 0.35 },
  });
  map.addLayer({
    id: "plots-outline",
    type: "line",
    source: "plots",
    paint: { "line-color": "#16a34a", "line-width": 2 },
  });
}

function fitToPlots(map: maplibregl.Map, plots: PlotMapFeature[]) {
  const bounds = new maplibregl.LngLatBounds();
  let hasPoints = false;
  for (const plot of plots) {
    for (const [lng, lat] of plot.boundary.coordinates[0]) {
      bounds.extend([lng, lat]);
      hasPoints = true;
    }
  }
  if (hasPoints) map.fitBounds(bounds, { padding: 48, maxZoom: 17 });
}

function featureCollection(plots: PlotMapFeature[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: plots.map((plot) => ({
      type: "Feature",
      geometry: plot.boundary,
      properties: { id: plot.id, name: plot.name },
    })),
  };
}
