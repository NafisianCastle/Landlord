import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import RegisterServiceWorker from "./RegisterServiceWorker";

afterEach(() => {
  vi.unstubAllGlobals();
  // @ts-expect-error test cleanup of a property we may have defined
  delete navigator.serviceWorker;
});

describe("RegisterServiceWorker", () => {
  it("registers /sw.js when serviceWorker is supported", () => {
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register },
    });
    render(<RegisterServiceWorker />);
    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("renders nothing and does not throw when serviceWorker is unsupported", () => {
    const { container } = render(<RegisterServiceWorker />);
    expect(container).toBeEmptyDOMElement();
  });

  it("swallows a rejected registration without throwing", async () => {
    const register = vi.fn().mockRejectedValue(new Error("nope"));
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register },
    });
    expect(() => render(<RegisterServiceWorker />)).not.toThrow();
    await Promise.resolve();
  });
});
