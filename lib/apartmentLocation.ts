export interface ApartmentCoordinates { lat: number; lng: number }

export function validApartmentLocation(value: unknown): value is ApartmentCoordinates | null {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<ApartmentCoordinates>;
  return typeof point.lat === "number" && Number.isFinite(point.lat) && Math.abs(point.lat) <= 90 &&
    typeof point.lng === "number" && Number.isFinite(point.lng) && Math.abs(point.lng) <= 180;
}

export function apartmentLocation(lat: number | null | undefined, lng: number | null | undefined): ApartmentCoordinates | null {
  const point = { lat, lng };
  return validApartmentLocation(point) ? point : null;
}
