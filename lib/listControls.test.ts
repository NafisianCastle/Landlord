import { describe, expect, it } from "vitest";
import { applyListControls, byName, byNumberDesc, districtsOf } from "./listControls";

const items = [
  { name: "Charlie", district: "Dhaka", area: 50 },
  { name: "alpha", district: "Sylhet", area: null },
  { name: "Bravo", district: "Dhaka", area: 200 },
];
const options = {
  searchable: (i: (typeof items)[number]) => [i.name, i.district],
  districtOf: (i: (typeof items)[number]) => i.district,
  sorters: { name: byName, area: byNumberDesc((i: (typeof items)[number]) => i.area) },
};

describe("list controls", () => {
  it("keeps server (newest-first) order by default", () => {
    expect(applyListControls(items, { query: "", district: "", sort: "newest" }, options)).toEqual(items);
  });

  it("searches, filters by district and sorts", () => {
    const run = (query: string, district: string, sort: string) =>
      applyListControls(items, { query, district, sort }, options).map((i) => i.name);
    expect(run("dhaka", "", "newest")).toEqual(["Charlie", "Bravo"]);
    expect(run("", "Dhaka", "name")).toEqual(["Bravo", "Charlie"]);
    expect(run("", "", "area")).toEqual(["Bravo", "Charlie", "alpha"]);
  });

  it("lists distinct districts alphabetically", () => {
    expect(districtsOf([...items, { name: "x", district: null, area: 1 }], (i) => i.district)).toEqual([
      "Dhaka",
      "Sylhet",
    ]);
  });
});
