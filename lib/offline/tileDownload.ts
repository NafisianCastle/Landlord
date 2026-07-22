// Manual "download this area for offline use" — mirrors what Google Maps'
// offline-area download does, but scoped to the satellite raster layer only.
// The streets layer is a remote vector style (dynamic TileJSON path, sprites,
// glyphs) — properly caching it offline is a separate, bigger effort, so for
// now downloads only work against the Esri satellite tiles, which are a
// plain {z}/{x}/{y} raster grid and match this app's default base layer.

export const TILE_CACHE_NAME = "landly-map-tiles-v1";
const SATELLITE_TILE_URL = (z: number, x: number, y: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

const MAX_TILES = 3000;
const CONCURRENCY = 6;

export interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

interface Tile {
  z: number;
  x: number;
  y: number;
}

function lngToTileX(lng: number, z: number) {
  return Math.floor(((lng + 180) / 360) * 2 ** z);
}

function latToTileY(lat: number, z: number) {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z,
  );
}

export function tilesForBounds(bounds: Bounds, minZoom: number, maxZoom: number): Tile[] {
  const tiles: Tile[] = [];
  for (let z = minZoom; z <= maxZoom; z++) {
    const xMin = lngToTileX(bounds.west, z);
    const xMax = lngToTileX(bounds.east, z);
    // latitude decreases as tile y increases, so north (max lat) gives min y
    const yMin = latToTileY(bounds.north, z);
    const yMax = latToTileY(bounds.south, z);
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        tiles.push({ z, x, y });
      }
    }
  }
  return tiles;
}

export function estimateTileCount(bounds: Bounds, minZoom: number, maxZoom: number) {
  return tilesForBounds(bounds, minZoom, maxZoom).length;
}

export interface DownloadProgress {
  done: number;
  total: number;
}

export class AreaTooLargeError extends Error {}

export async function downloadArea(
  bounds: Bounds,
  minZoom: number,
  maxZoom: number,
  onProgress: (progress: DownloadProgress) => void,
  signal: AbortSignal,
): Promise<{ tileCount: number; bytesStored: number }> {
  const tiles = tilesForBounds(bounds, minZoom, maxZoom);
  if (tiles.length > MAX_TILES) {
    throw new AreaTooLargeError(
      `That area needs ${tiles.length} tiles, which is over the ${MAX_TILES} limit — zoom in a bit or shrink the view before downloading.`,
    );
  }

  const cache = await caches.open(TILE_CACHE_NAME);
  let done = 0;
  let bytesStored = 0;
  let index = 0;

  async function worker() {
    while (index < tiles.length) {
      if (signal.aborted) return;
      const tile = tiles[index++];
      const url = SATELLITE_TILE_URL(tile.z, tile.x, tile.y);
      const existing = await cache.match(url);
      if (!existing) {
        const response = await fetch(url, { signal });
        if (response.ok) {
          bytesStored += Number(response.headers.get("content-length") ?? 0);
          await cache.put(url, response);
        }
      }
      done++;
      onProgress({ done, total: tiles.length });
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return { tileCount: tiles.length, bytesStored };
}

export async function deleteArea(bounds: Bounds, minZoom: number, maxZoom: number) {
  const cache = await caches.open(TILE_CACHE_NAME);
  const tiles = tilesForBounds(bounds, minZoom, maxZoom);
  await Promise.all(
    tiles.map((tile) => cache.delete(SATELLITE_TILE_URL(tile.z, tile.x, tile.y))),
  );
}
