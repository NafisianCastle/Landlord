"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import maplibregl from "@/lib/map";
import { styleFor, type BaseStyle } from "@/lib/mapStyles";
import { searchPlaces, type GeocodeResult } from "@/lib/geocode";
import { validApartmentLocation, type ApartmentCoordinates } from "@/lib/apartmentLocation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ApartmentLocationMap({point, editable, onChange}: {
  point: ApartmentCoordinates | null; editable: boolean; onChange: (point: ApartmentCoordinates) => void;
}) {
  const t = useTranslations("ApartmentLocation");
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const current = useRef({point, editable, onChange});
  useEffect(() => { current.current = {point, editable, onChange}; }, [point, editable, onChange]);
  const [style, setStyle] = useState<BaseStyle>("streets");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    let instance: maplibregl.Map;
    try {
      const initial = current.current.point;
      instance = new maplibregl.Map({ container: container.current, style: styleFor("streets"),
        center: initial ? [initial.lng,initial.lat] : [90.4125,23.8103], zoom: initial ? 17 : 6, maxZoom: 19 });
    } catch { queueMicrotask(() => setError(t("mapUnavailable"))); return; }
    map.current = instance;
    instance.addControl(new maplibregl.NavigationControl({showCompass:false}), "top-left");
    instance.on("click", event => {
      if (!current.current.editable) return;
      const {lat,lng} = event.lngLat.wrap();
      current.current.onChange({lat,lng});
    });
    instance.on("error", () => setError(t("mapUnavailable")));
    // The DOM marker persists when switching street/satellite styles.
    const initial = current.current.point;
    if (initial) marker.current = new maplibregl.Marker({draggable:current.current.editable})
      .setLngLat([initial.lng,initial.lat]).addTo(instance);
    const onDrag = () => {
      const pos = marker.current?.getLngLat().wrap();
      if (pos && current.current.editable) current.current.onChange({lat:pos.lat,lng:pos.lng});
    };
    marker.current?.on("dragend",onDrag);
    return () => { marker.current?.remove(); marker.current=null; instance.remove(); map.current=null; };
  }, [t]);

  useEffect(() => {
    if (!map.current) return;
    if (!point) {marker.current?.remove();marker.current=null;return;}
    if (!marker.current) {
      marker.current = new maplibregl.Marker({draggable:editable}).setLngLat([point.lng,point.lat]).addTo(map.current);
      marker.current.on("dragend", () => {
        const pos = marker.current?.getLngLat().wrap();
        if (pos && current.current.editable) current.current.onChange({lat:pos.lat,lng:pos.lng});
      });
    }
    marker.current.setLngLat([point.lng,point.lat]).setDraggable(editable);
    // Keep the camera still when tapping/dragging a visible pin. Search/GPS
    // selections outside the current view should bring the new point into view.
    if (!map.current.getBounds().contains([point.lng,point.lat]) || map.current.getZoom() < 16)
      map.current.flyTo({center:[point.lng,point.lat], zoom:Math.max(map.current.getZoom(),16)});
  }, [point,editable]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      if (query.trim().length < 3 || !editable) {setResults([]);setSearching(false); return;}
      setSearching(true);
      try {
        const places = await searchPlaces(query,controller.signal);
        if (!controller.signal.aborted) setResults(places.filter(p => validApartmentLocation(p.center)));
      } catch {if (!controller.signal.aborted) {setResults([]);setError(t("searchFailed"));}}
      finally {if (!controller.signal.aborted) setSearching(false);}
    },350);
    return () => {clearTimeout(timeout);controller.abort();};
  },[query,editable,t]);

  return <div className="flex flex-col gap-3">
    {editable && <div className="flex flex-col gap-1.5"><Label htmlFor={`${id}-search`}>{t("search")}</Label>
      <Input id={`${id}-search`} value={query} maxLength={200} onChange={e => {setQuery(e.target.value);setResults([]);setError(null);}} placeholder={t("searchPlaceholder")} />
      {searching && <p role="status" className="text-xs text-muted-foreground">{t("searching")}</p>}
      {results.length > 0 && <ul className="divide-y divide-border rounded-lg border border-border">{results.map((place,i) => <li key={i}>
        <button type="button" className="w-full break-words p-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => {
          onChange(place.center);setQuery("");setResults([]);
        }}>{place.label}</button>
      </li>)}</ul>}
    </div>}
    <div className="relative overflow-hidden rounded-lg border border-border">
      <div ref={container} className="h-72 w-full" role="region" aria-label={t("mapLabel")} />
      <Button type="button" size="sm" variant="outline" className="absolute right-2 top-2 bg-background" onClick={() => {
        const next = style === "streets" ? "satellite" : "streets";
        map.current?.setStyle(styleFor(next),{diff:false}); setStyle(next);setError(null);
      }}>{t(style === "streets" ? "satellite" : "streets")}</Button>
    </div>
    {error && <p role="status" className="text-sm text-muted-foreground">{error}</p>}
  </div>;
}
