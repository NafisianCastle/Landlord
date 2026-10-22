// Search + district filter + sort for the plots and apartments lists. Items
// arrive newest first from the server, so "newest" keeps that order.

export interface ListControls {
  query: string;
  /** "" means all districts. */
  district: string;
  sort: string;
}

export function districtsOf<T>(items: T[], districtOf: (item: T) => string | null): string[] {
  return [...new Set(items.map(districtOf).filter((d): d is string => Boolean(d)))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function applyListControls<T>(
  items: T[],
  controls: ListControls,
  options: {
    searchable: (item: T) => (string | null)[];
    districtOf: (item: T) => string | null;
    /** Comparators by sort key; unknown keys (and "newest") keep server order. */
    sorters: Record<string, (a: T, b: T) => number>;
  },
): T[] {
  const q = controls.query.trim().toLowerCase();
  const filtered = items.filter(
    (item) =>
      (!q || options.searchable(item).some((field) => field?.toLowerCase().includes(q))) &&
      (!controls.district || options.districtOf(item) === controls.district),
  );
  const sorter = options.sorters[controls.sort];
  return sorter ? [...filtered].sort(sorter) : filtered;
}

export const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

/** Largest first; items without a value go last. */
export const byNumberDesc =
  <T>(value: (item: T) => number | null) =>
  (a: T, b: T) =>
    (value(b) ?? -Infinity) - (value(a) ?? -Infinity);
