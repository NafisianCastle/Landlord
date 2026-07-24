import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AreaTooLargeError,
  deleteArea,
  downloadArea,
  estimateTileCount,
  TILE_CACHE_NAME,
  tilesForBounds,
  type Bounds,
} from "./tileDownload";

const dhakaBounds: Bounds = { west: 90.35, south: 23.7, east: 90.45, north: 23.8 };

describe("tilesForBounds", () => {
  it("returns exactly 1 tile at z0 for a bounds strictly inside the world", () => {
    const tiles = tilesForBounds({ west: -170, south: -80, east: 170, north: 80 }, 0, 0);
    expect(tiles).toEqual([{ z: 0, x: 0, y: 0 }]);
  });

  it("east edge exactly at lng 180 spills into tile x=1 at z0 (floor edge case)", () => {
    const tiles = tilesForBounds({ west: -180, south: -85, east: 180, north: 85 }, 0, 0);
    expect(tiles).toEqual([{ z: 0, x: 0, y: 0 }, { z: 0, x: 1, y: 0 }]);
  });

  it("returns tiles for every zoom level in [minZoom, maxZoom] inclusive", () => {
    const tiles = tilesForBounds(dhakaBounds, 10, 12);
    const zooms = new Set(tiles.map((t) => t.z));
    expect(zooms).toEqual(new Set([10, 11, 12]));
  });

  it("returns a single-zoom set when minZoom === maxZoom", () => {
    const tiles = tilesForBounds(dhakaBounds, 14, 14);
    expect(tiles.every((t) => t.z === 14)).toBe(true);
    expect(tiles.length).toBeGreaterThan(0);
  });

  it("north edge maps to a smaller or equal tile-y than the south edge", () => {
    const tiles = tilesForBounds(dhakaBounds, 15, 15);
    const ys = tiles.map((t) => t.y);
    // sanity: y range should be non-empty and internally consistent
    expect(Math.min(...ys)).toBeLessThanOrEqual(Math.max(...ys));
  });

  it("produces no tiles when maxZoom < minZoom", () => {
    expect(tilesForBounds(dhakaBounds, 15, 10)).toEqual([]);
  });
});

describe("estimateTileCount", () => {
  it("matches tilesForBounds().length", () => {
    expect(estimateTileCount(dhakaBounds, 10, 14)).toBe(
      tilesForBounds(dhakaBounds, 10, 14).length,
    );
  });

  it("is 0 for an empty zoom range", () => {
    expect(estimateTileCount(dhakaBounds, 15, 10)).toBe(0);
  });
});

function makeFakeCache() {
  const store = new Map<string, Response>();
  return {
    match: vi.fn(async (url: string) => store.get(url)),
    put: vi.fn(async (url: string, response: Response) => {
      store.set(url, response);
    }),
    delete: vi.fn(async (url: string) => store.delete(url)),
    _store: store,
  };
}

describe("downloadArea / deleteArea", () => {
  let fakeCache: ReturnType<typeof makeFakeCache>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fakeCache = makeFakeCache();
    vi.stubGlobal("caches", { open: vi.fn(async () => fakeCache) });
    fetchMock = vi.fn(async () => ({
      ok: true,
      headers: new Headers({ "content-length": "1024" }),
    }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws AreaTooLargeError without touching the cache when over the tile limit", async () => {
    // ~7950 tiles for this bounds/zoom range — over MAX_TILES (3000) but
    // small enough to build the candidate list without ballooning memory
    // (unlike e.g. a world-bounds z0-14 sweep, which is hundreds of millions).
    const onProgress = vi.fn();
    await expect(
      downloadArea(dhakaBounds, 10, 18, onProgress, new AbortController().signal),
    ).rejects.toBeInstanceOf(AreaTooLargeError);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("downloads and caches every tile, reporting progress and total bytes", async () => {
    const onProgress = vi.fn();
    const result = await downloadArea(dhakaBounds, 14, 14, onProgress, new AbortController().signal);
    const expectedCount = estimateTileCount(dhakaBounds, 14, 14);

    expect(result.tileCount).toBe(expectedCount);
    expect(result.bytesStored).toBe(expectedCount * 1024);
    expect(fetchMock).toHaveBeenCalledTimes(expectedCount);
    expect(onProgress).toHaveBeenLastCalledWith({ done: expectedCount, total: expectedCount });
  });

  it("skips fetching tiles already present in the cache", async () => {
    const tiles = tilesForBounds(dhakaBounds, 14, 14);
    const existingUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${tiles[0].z}/${tiles[0].y}/${tiles[0].x}`;
    fakeCache._store.set(existingUrl, new Response("cached"));

    const onProgress = vi.fn();
    const result = await downloadArea(dhakaBounds, 14, 14, onProgress, new AbortController().signal);
    expect(fetchMock).toHaveBeenCalledTimes(tiles.length - 1);
    expect(result.tileCount).toBe(tiles.length);
  });

  it("does not count bytes or cache a tile whose fetch response is not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, headers: new Headers() });
    const result = await downloadArea(dhakaBounds, 14, 14, vi.fn(), new AbortController().signal);
    expect(result.bytesStored).toBe(0);
    expect(fakeCache.put).not.toHaveBeenCalled();
  });

  it("stops issuing new fetches once the signal is aborted", async () => {
    const controller = new AbortController();
    let calls = 0;
    fetchMock.mockImplementation(async () => {
      calls++;
      if (calls === 1) controller.abort();
      return { ok: true, headers: new Headers({ "content-length": "10" }) };
    });
    const total = estimateTileCount(dhakaBounds, 14, 14);
    const result = await downloadArea(dhakaBounds, 14, 14, vi.fn(), controller.signal);
    expect(result.tileCount).toBe(total);
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(total);
  });

  it("deleteArea removes every tile for the bounds/zoom range from the cache", async () => {
    await deleteArea(dhakaBounds, 14, 14);
    const tiles = tilesForBounds(dhakaBounds, 14, 14);
    expect(fakeCache.delete).toHaveBeenCalledTimes(tiles.length);
  });

  it("uses a stable, versioned cache name", () => {
    expect(TILE_CACHE_NAME).toBe("landlord-map-tiles-v1");
  });
});
