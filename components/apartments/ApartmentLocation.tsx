"use client";

import dynamic from "next/dynamic";
import { useId, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { apartmentLocation, validApartmentLocation, type ApartmentCoordinates } from "@/lib/apartmentLocation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// MapLibre and map tiles are loaded only when the user opens the map.
const LocationMap = dynamic(() => import("./ApartmentLocationMap"), { ssr: false });
type SaveLocation = (point: ApartmentCoordinates | null) => Promise<{ error?: string; success?: boolean }>;

export default function ApartmentLocation({ latitude, longitude, canEdit = false, onSave }: {
  latitude?: number | null; longitude?: number | null; canEdit?: boolean; onSave?: SaveLocation;
}) {
  const t = useTranslations("ApartmentLocation");
  const id = useId();
  const [saved, setSaved] = useState(() => apartmentLocation(latitude, longitude));
  const [lat, setLat] = useState(saved?.lat.toString() ?? "");
  const [lng, setLng] = useState(saved?.lng.toString() ?? "");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const gpsAttempt = useRef(0);
  const draft = lat.trim() && lng.trim() ? {lat: Number(lat), lng: Number(lng)} : null;
  const point = validApartmentLocation(draft) ? draft : null;

  function choose(next: ApartmentCoordinates) {
    if (!validApartmentLocation(next)) return;
    setLat(next.lat.toFixed(6)); setLng(next.lng.toFixed(6)); setSuccess(false); setError(null);
  }
  function locate() {
    setError(null); setSuccess(false);
    if (!navigator.geolocation) { setError(t("gpsUnavailable")); return; }
    const attempt = ++gpsAttempt.current;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(position => {
      if (gpsAttempt.current !== attempt) return;
      setLocating(false);
      const next = {lat: position.coords.latitude, lng: position.coords.longitude};
      if (!validApartmentLocation(next)) {setError(t("gpsUnavailable")); return;}
      choose(next);
    }, () => {
      if (gpsAttempt.current !== attempt) return;
      setLocating(false); setError(t("gpsUnavailable"));
    }, {enableHighAccuracy: true, timeout: 15000, maximumAge: 0});
  }
  function save(next: ApartmentCoordinates | null) {
    if (!onSave) return;
    gpsAttempt.current++; setLocating(false); setError(null); setSuccess(false);
    startTransition(async () => {
      try {
        const result = await onSave(next);
        if (result.error) {setError(result.error); return;}
        setSaved(next); setLat(next?.lat.toString() ?? ""); setLng(next?.lng.toString() ?? ""); setSuccess(true);
      } catch {setError(t("saveFailed"));}
    });
  }
  return <section className="flex flex-col gap-3 rounded-xl border border-border p-4" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} className="font-medium">{t("title")}</h2>
    <p className="text-sm text-muted-foreground">{t(canEdit ? "hint" : "viewHint")}</p>
    <p className="text-sm text-muted-foreground">{saved ? t("savedCoordinates", {lat: saved.lat.toFixed(6), lng: saved.lng.toFixed(6)}) : t("noLocation")}</p>
    {(canEdit || saved) && <Button type="button" variant="outline" className="w-fit" aria-expanded={open} aria-controls={`${id}-map`} onClick={() => setOpen(!open)}>
      {t(open ? "closeMap" : "openMap")}
    </Button>}
    {open && <div id={`${id}-map`}><LocationMap point={canEdit ? point : saved} editable={canEdit && !pending && !locating} onChange={choose} /></div>}
    {canEdit && onSave && <form onSubmit={event => {
      event.preventDefault();
      if (!lat.trim() || !lng.trim() || !point) {setError(t("invalidCoordinates")); return;}
      save(point);
    }} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5"><Label htmlFor={`${id}-lat`}>{t("latitude")}</Label>
          <Input id={`${id}-lat`} type="number" min={-90} max={90} step="any" required value={lat} disabled={pending || locating}
            onChange={e => {setLat(e.target.value); setSuccess(false);}} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor={`${id}-lng`}>{t("longitude")}</Label>
          <Input id={`${id}-lng`} type="number" min={-180} max={180} step="any" required value={lng} disabled={pending || locating}
            onChange={e => {setLng(e.target.value); setSuccess(false);}} /></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={pending || locating} onClick={locate}>{t(locating ? "locating" : "useGps")}</Button>
        <Button type="submit" disabled={pending || locating}>{t(pending ? "saving" : "save")}</Button>
        {saved && <Button type="button" variant="ghost" disabled={pending || locating} onClick={() => save(null)}>{t("remove")}</Button>}
      </div>
    </form>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {success && <p role="status" className="text-sm text-muted-foreground">{t("saved")}</p>}
  </section>;
}
