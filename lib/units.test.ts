import { describe, expect, it } from "vitest";
import { convertArea, SQ_METERS_PER_DECIMAL } from "./units";

describe("convertArea", () => {
  it("converts a positive area to all units", () => {
    const result = convertArea(SQ_METERS_PER_DECIMAL);
    expect(result.sqMeters).toBe(SQ_METERS_PER_DECIMAL);
    expect(result.decimal).toBeCloseTo(1, 10);
    expect(result.bigha).toBeCloseTo(1 / 33, 10);
    expect(result.katha).toBeCloseTo(1 / (33 / 20), 10);
    expect(result.kani).toBeCloseTo(1 / 40, 10);
    expect(result.gonda).toBeCloseTo(1 / 2, 10);
    expect(result.acre).toBeGreaterThan(0);
    expect(result.sqFt).toBeGreaterThan(0);
    expect(result.sqMile).toBeGreaterThan(0);
    expect(result.sqKm).toBeGreaterThan(0);
  });

  it("handles zero area", () => {
    const result = convertArea(0);
    for (const value of Object.values(result)) {
      expect(value).toBe(0);
    }
  });

  it("handles negative area by propagating the sign (no clamping)", () => {
    const result = convertArea(-SQ_METERS_PER_DECIMAL);
    expect(result.decimal).toBeCloseTo(-1, 10);
    expect(result.acre).toBeLessThan(0);
  });

  it("scales linearly with input", () => {
    const single = convertArea(1000);
    const doubled = convertArea(2000);
    expect(doubled.decimal).toBeCloseTo(single.decimal * 2, 10);
    expect(doubled.acre).toBeCloseTo(single.acre * 2, 10);
  });

  it("handles very large and very small areas without NaN/Infinity", () => {
    const large = convertArea(1e12);
    const small = convertArea(1e-6);
    for (const value of [...Object.values(large), ...Object.values(small)]) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it("produces NaN for NaN input", () => {
    const result = convertArea(NaN);
    expect(Number.isNaN(result.decimal)).toBe(true);
  });
});
