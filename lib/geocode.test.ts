import { afterEach, describe, expect, it, vi } from "vitest";
import { searchPlaces } from "./geocode";

describe("searchPlaces", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns [] without calling fetch for queries under 3 chars", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await searchPlaces("ab")).toEqual([]);
    expect(await searchPlaces("  a ")).toEqual([]);
    expect(await searchPlaces("")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("trims whitespace before checking length and building the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ features: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await searchPlaces("  dhaka  ");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("q=dhaka"),
      expect.anything(),
    );
  });

  it("maps Point features to GeocodeResult, joining available labels", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            geometry: { type: "Point", coordinates: [90.4, 23.8] },
            properties: { name: "Dhaka", state: "Dhaka Division", country: "Bangladesh" },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const results = await searchPlaces("dhaka");
    expect(results).toEqual([
      { label: "Dhaka, Dhaka Division, Bangladesh", center: { lat: 23.8, lng: 90.4 } },
    ]);
  });

  it("falls back from city to county when city missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            geometry: { type: "Point", coordinates: [1, 2] },
            properties: { county: "SomeCounty" },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const results = await searchPlaces("xyz");
    expect(results[0].label).toBe("SomeCounty");
  });

  it("filters out non-Point features", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          { geometry: { type: "Polygon", coordinates: [] }, properties: { name: "Nope" } },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await searchPlaces("xyz")).toEqual([]);
  });

  it("handles missing properties object entirely", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [{ geometry: { type: "Point", coordinates: [1, 2] } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const results = await searchPlaces("xyz");
    expect(results[0].label).toBe("");
  });

  it("handles missing features field", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    expect(await searchPlaces("xyz")).toEqual([]);
  });

  it("throws when the response is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    await expect(searchPlaces("xyz")).rejects.toThrow("Search failed");
  });

  it("propagates AbortError when the signal aborts", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    const fetchMock = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    await expect(searchPlaces("xyz", controller.signal)).rejects.toThrow("Aborted");
  });
});
