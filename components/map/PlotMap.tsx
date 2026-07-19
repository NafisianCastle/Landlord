"use client";

import { useEffect, useRef } from "react";
import type { FeatureCollection, Polygon } from "geojson";
import mapboxgl from "@/lib/mapbox";

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
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [90.4125, 23.8103], // Dhaka, sensible default before plots load
      zoom: 6,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("plots", { type: "geojson", data: featureCollection([]) });
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
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const source = map.getSource("plots") as mapboxgl.GeoJSONSource | undefined;
      if (!source) return;
      source.setData(featureCollection(plots));

      const bounds = new mapboxgl.LngLatBounds();
      let hasPoints = false;
      for (const plot of plots) {
        for (const [lng, lat] of plot.boundary.coordinates[0]) {
          bounds.extend([lng, lat]);
          hasPoints = true;
        }
      }
      if (hasPoints) map.fitBounds(bounds, { padding: 48, maxZoom: 17 });
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [plots]);

  return <div ref={containerRef} className={className ?? "h-full w-full"} />;
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
