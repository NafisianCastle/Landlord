import { describe, expect, it } from "vitest";
import { expandRentRanges } from "./rent-history";
const expand = (ranges: unknown, start = "2022-01-31", end: string | null = null) => expandRentRanges(ranges, start, end, "2026-10-21");
describe("rent history ranges", () => {
  it("expands several years with rent changes, inclusive endpoints and leap February", () => {
    const result = expand([{ from: "2022-01", to: "2022-12", amount: "15000" }, { from: "2023-01", to: "2025-12", amount: "18000.50" }]);
    expect(result.months).toHaveLength(48);
    expect(result.months?.find(m => m.month === "2024-02")?.amount).toBe(18000.5);
    expect(result.months?.reduce((sum, m) => sum + m.amount, 0)).toBe(828018);
  });
  it("rejects overlapping ranges regardless of amount or order", () => {
    expect(expand([{ from: "2023-04", to: "2023-06", amount: "10" }, { from: "2023-01", to: "2023-04", amount: "20" }]).error).toBe("overlap");
  });
  it.each(["NaN", "Infinity", "0", "-1", "1.001", "1e3", "1000000000001", ""]) ("rejects invalid amounts %s", amount => {
    expect(expand([{ from: "2023-01", to: "2023-02", amount }]).error).toBe("invalidAmount");
  });
  it.each([null, {}, [], Array(51).fill({})])("rejects malformed/oversized submissions", value => expect(expand(value).error).toBe("invalidRanges"));
  it("validates month format, order, lease bounds and future months", () => {
    const range = { from: "2023-01", to: "2023-02", amount: "10" };
    expect(expand([{ ...range, from: "2023-13" }]).error).toBe("invalidMonth");
    expect(expand([{ ...range, from: "2023-03" }]).error).toBe("reversedRange");
    expect(expand([{ ...range, from: "2021-12" }]).error).toBe("outsideLease");
    expect(expand([range], "2022-01-01", "2023-01-30").error).toBe("outsideLease");
    expect(expand([{ ...range, to: "2026-11" }]).error).toBe("futureMonth");
  });
  it("supports gaps and single-month ranges", () => {
    expect(expand([{ from: "2023-03", to: "2023-03", amount: "0.01" }, { from: "2022-01", to: "2022-01", amount: "100" }]).months)
      .toEqual([{ month: "2022-01", amount: 100 }, { month: "2023-03", amount: 0.01 }]);
  });
  it("bounds the total months before processing huge dates", () => {
    expect(expand([{ from: "1900-01", to: "2025-12", amount: "10" }], "1900-01-01").error).toBe("tooManyMonths");
  });
});
