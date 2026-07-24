import { describe, expect, it } from "vitest";
import { SATELLITE_STYLE, STREETS_STYLE, styleFor } from "./mapStyles";

describe("styleFor", () => {
  it("returns the streets tile URL for 'streets'", () => {
    expect(styleFor("streets")).toBe(STREETS_STYLE);
  });

  it("returns the satellite style spec for 'satellite'", () => {
    expect(styleFor("satellite")).toBe(SATELLITE_STYLE);
  });

  it("falls back to satellite for any non-'streets' value", () => {
    // @ts-expect-error intentionally passing an invalid BaseStyle
    expect(styleFor("bogus")).toBe(SATELLITE_STYLE);
  });
});

describe("SATELLITE_STYLE", () => {
  it("caps maxzoom at 19", () => {
    const esriSource = SATELLITE_STYLE.sources.esri as { maxzoom?: number };
    expect(esriSource.maxzoom).toBe(19);
  });
});
