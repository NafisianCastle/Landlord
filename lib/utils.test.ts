import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins plain class strings", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, 0, "b")).toBe("a b");
  });

  it("merges conflicting tailwind classes, keeping the last", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("supports conditional object syntax", () => {
    expect(cn({ a: true, b: false, c: true })).toBe("a c");
  });

  it("returns empty string for no input", () => {
    expect(cn()).toBe("");
  });

  it("flattens arrays of classes", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });
});
