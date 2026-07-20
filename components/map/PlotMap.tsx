"use client";

import { useEffect, useRef, useState } from "react";
import type { FeatureCollection, Polygon } from "geojson";
import maplibregl from "@/lib/map";
import { styleFor, type BaseStyle } from "@/lib/mapStyles";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const [baseStyle, setBaseStyle] = useState<BaseStyle>("satellite");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleFor(baseStyle),
      center: [90.4125, 23.8103], // Dhaka, sensible default before plots load
      zoom: 6,
    });
    mapRef.current = map;

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

  return (
    <div className={`relative ${className ?? "h-full w-full"}`}>
      <div ref={containerRef} className="h-full w-full" />
      <button
        type="button"
        onClick={toggleStyle}
        className="absolute right-2 top-2 rounded bg-white px-2 py-1 text-xs shadow"
      >
        {baseStyle === "satellite" ? "Streets" : "Satellite"}
      </button>
    </div>
  );
}

function addPlotLayers(map: maplibregl.Map, plots: PlotMapFeature[]) {
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
