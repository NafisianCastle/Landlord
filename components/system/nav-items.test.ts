import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "./nav-items";

describe("NAV_ITEMS", () => {
  it("defines dashboard, plots, and profile routes with icons", () => {
    expect(NAV_ITEMS.map((i) => i.href)).toEqual(["/dashboard", "/plots", "/profile"]);
    for (const item of NAV_ITEMS) {
      expect(item.label).toBeTruthy();
      expect(item.icon).toBeDefined();
    }
  });
});
