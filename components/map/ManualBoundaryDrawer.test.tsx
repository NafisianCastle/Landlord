import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ManualBoundaryDrawer from "./ManualBoundaryDrawer";

const { FakeMap, fakeMapInstances } = vi.hoisted(() => {
  class FakeMap {
    handlers: Record<string, Array<{ layer?: string; cb: (...args: unknown[]) => void }>> = {};
    sources: Record<string, { setData: ReturnType<typeof vi.fn> }> = {};
    removed = false;
    dragPan = { enable: vi.fn(), disable: vi.fn() };
    flyTo = vi.fn();
    canvasStyle: Record<string, string> = {};
    queryRenderedFeaturesResult: unknown[] = [];

    constructor(public options: unknown) {
      fakeMapInstances.push(this);
    }
    on(event: string, a: unknown, b?: unknown) {
      const layer = typeof a === "string" ? a : undefined;
      const cb = (typeof a === "function" ? a : b) as (...args: unknown[]) => void;
      (this.handlers[event] ??= []).push({ layer, cb });
      return this;
    }
    once(event: string, cb: (...args: unknown[]) => void) {
      (this.handlers[event] ??= []).push({ cb });
      return this;
    }
    fire(event: string, ...args: unknown[]) {
      for (const h of this.handlers[event] ?? []) h.cb(...args);
    }
    addControl() {}
    addSource(id: string) {
      this.sources[id] = { setData: vi.fn() };
    }
    getSource(id: string) {
      return this.sources[id];
    }
    addLayer() {}
    setCenter() {}
    setStyle() {
      this.fire("style.load");
    }
    isStyleLoaded() {
      return true;
    }
    getCanvas() {
      return { style: this.canvasStyle };
    }
    queryRenderedFeatures() {
      return this.queryRenderedFeaturesResult;
    }
    remove() {
      this.removed = true;
    }
  }

  const fakeMapInstances: InstanceType<typeof FakeMap>[] = [];
  return { FakeMap, fakeMapInstances };
});

vi.mock("@/lib/map", () => ({
  default: {
    Map: FakeMap,
    Marker: class {},
    NavigationControl: class {},
  },
}));

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const savePlotBoundaryMock = vi.fn();
vi.mock("@/app/actions/plots", () => ({
  savePlotBoundary: (...a: unknown[]) => savePlotBoundaryMock(...a),
}));

const searchPlacesMock = vi.fn();
vi.mock("@/lib/geocode", () => ({
  searchPlaces: (...a: unknown[]) => searchPlacesMock(...a),
}));

function mockGeolocation(succeed = true) {
  Object.defineProperty(global.navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn((success, error) => {
        if (succeed) success({ coords: { latitude: 23.8, longitude: 90.4 } });
        else error();
      }),
    },
  });
}

beforeEach(() => {
  fakeMapInstances.length = 0;
  vi.clearAllMocks();
  savePlotBoundaryMock.mockResolvedValue({ success: true });
  searchPlacesMock.mockResolvedValue([]);
  mockGeolocation();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function getMap() {
  return fakeMapInstances[0];
}

describe("ManualBoundaryDrawer — placing and editing points", () => {
  it("adds a point when the empty map is clicked", async () => {
    render(<ManualBoundaryDrawer plotId="p1" />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = getMap();
    map.fire("click", { point: {}, lngLat: { lat: 1, lng: 2 } });
    expect(await screen.findByRole("button", { name: "Save boundary (1 points)" })).toBeInTheDocument();
  });

  it("does not add a point when the click hit an existing draw-point (avoids dup on drag start)", async () => {
    render(<ManualBoundaryDrawer plotId="p1" />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = getMap();
    map.queryRenderedFeaturesResult = [{}];
    map.fire("click", { point: {}, lngLat: { lat: 1, lng: 2 } });
    expect(screen.getByRole("button", { name: "Save boundary (0 points)" })).toBeInTheDocument();
  });

  it("removes a point on double-click of a draw-point", async () => {
    render(<ManualBoundaryDrawer plotId="p1" />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = getMap();
    map.fire("click", { point: {}, lngLat: { lat: 1, lng: 1 } });
    map.fire("click", { point: {}, lngLat: { lat: 2, lng: 2 } });
    await screen.findByRole("button", { name: "Save boundary (2 points)" });

    map.fire("dblclick", {
      preventDefault: vi.fn(),
      features: [{ properties: { index: 0 } }],
    });
    expect(await screen.findByRole("button", { name: "Save boundary (1 points)" })).toBeInTheDocument();
  });

  it("drags a point via mousedown/mousemove/mouseup and disables/enables dragPan", async () => {
    render(<ManualBoundaryDrawer plotId="p1" />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = getMap();
    map.fire("load"); // triggers addDrawLayers, which creates the "draw" source
    map.fire("click", { point: {}, lngLat: { lat: 1, lng: 1 } });
    await screen.findByRole("button", { name: "Save boundary (1 points)" });

    map.fire("mousedown", {
      preventDefault: vi.fn(),
      features: [{ properties: { index: 0 } }],
    });
    expect(map.dragPan.disable).toHaveBeenCalled();

    act(() => {
      map.fire("mousemove", { lngLat: { lat: 5, lng: 6 } });
    });
    map.fire("mouseup");
    expect(map.dragPan.enable).toHaveBeenCalled();

    expect(map.sources.draw.setData).toHaveBeenCalled();
  });

  it("undoes the last point", async () => {
    render(<ManualBoundaryDrawer plotId="p1" />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = getMap();
    map.fire("click", { point: {}, lngLat: { lat: 1, lng: 1 } });
    await screen.findByRole("button", { name: "Save boundary (1 points)" });
    await userEvent.click(screen.getByRole("button", { name: "Undo last" }));
    expect(screen.getByRole("button", { name: "Save boundary (0 points)" })).toBeInTheDocument();
  });

  it("Undo last and Clear all are disabled with no points", () => {
    render(<ManualBoundaryDrawer plotId="p1" />);
    expect(screen.getByRole("button", { name: "Undo last" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear all" })).toBeDisabled();
  });

  it("clears all points after confirming", async () => {
    render(<ManualBoundaryDrawer plotId="p1" />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = getMap();
    map.fire("click", { point: {}, lngLat: { lat: 1, lng: 1 } });
    await screen.findByRole("button", { name: "Save boundary (1 points)" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await userEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByRole("button", { name: "Save boundary (0 points)" })).toBeInTheDocument();
  });

  it("keeps points when clearing is declined", async () => {
    render(<ManualBoundaryDrawer plotId="p1" />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = getMap();
    map.fire("click", { point: {}, lngLat: { lat: 1, lng: 1 } });
    await screen.findByRole("button", { name: "Save boundary (1 points)" });
    vi.spyOn(window, "confirm").mockReturnValue(false);
    await userEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByRole("button", { name: "Save boundary (1 points)" })).toBeInTheDocument();
  });
});

describe("ManualBoundaryDrawer — save flow", () => {
  it("keeps Save disabled with fewer than 3 points", async () => {
    render(<ManualBoundaryDrawer plotId="p1" />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = getMap();
    map.fire("click", { point: {}, lngLat: { lat: 1, lng: 1 } });
    map.fire("click", { point: {}, lngLat: { lat: 2, lng: 2 } });
    expect(
      await screen.findByRole("button", { name: "Save boundary (2 points)" }),
    ).toBeDisabled();
  });

  it("saves and refreshes the router on success", async () => {
    render(<ManualBoundaryDrawer plotId="p1" />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = getMap();
    map.fire("click", { point: {}, lngLat: { lat: 0, lng: 0 } });
    map.fire("click", { point: {}, lngLat: { lat: 0, lng: 1 } });
    map.fire("click", { point: {}, lngLat: { lat: 1, lng: 1 } });
    const saveBtn = await screen.findByRole("button", { name: "Save boundary (3 points)" });
    await userEvent.click(saveBtn);
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(savePlotBoundaryMock).toHaveBeenCalledWith(
      "p1",
      expect.arrayContaining([{ lat: 0, lng: 0 }]),
    );
  });

  it("shows the error and does not refresh when saving fails", async () => {
    savePlotBoundaryMock.mockResolvedValue({ error: "boundary invalid" });
    render(<ManualBoundaryDrawer plotId="p1" />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = getMap();
    map.fire("click", { point: {}, lngLat: { lat: 0, lng: 0 } });
    map.fire("click", { point: {}, lngLat: { lat: 0, lng: 1 } });
    map.fire("click", { point: {}, lngLat: { lat: 1, lng: 1 } });
    const saveBtn = await screen.findByRole("button", { name: "Save boundary (3 points)" });
    await userEvent.click(saveBtn);
    expect(await screen.findByText("boundary invalid")).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });
});

describe("ManualBoundaryDrawer — search", () => {
  it("does not search for queries under 3 characters", async () => {
    render(<ManualBoundaryDrawer plotId="p1" />);
    await userEvent.type(
      screen.getByPlaceholderText("Search a place to navigate there..."),
      "ab",
    );
    await new Promise((r) => setTimeout(r, 350));
    expect(searchPlacesMock).not.toHaveBeenCalled();
  });

  it("searches after debounce and lists results; selecting one flies to it", async () => {
    searchPlacesMock.mockResolvedValue([
      { label: "Dhaka", center: { lat: 23.8, lng: 90.4 } },
    ]);
    render(<ManualBoundaryDrawer plotId="p1" />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    await userEvent.type(
      screen.getByPlaceholderText("Search a place to navigate there..."),
      "dhaka",
    );
    await waitFor(() => expect(searchPlacesMock).toHaveBeenCalled(), { timeout: 1000 });
    const option = await screen.findByRole("button", { name: "Dhaka" });
    await userEvent.click(option);
    expect(getMap().flyTo).toHaveBeenCalledWith({ center: [90.4, 23.8], zoom: 17 });
    expect(
      screen.getByPlaceholderText("Search a place to navigate there..."),
    ).toHaveValue("Dhaka");
  });
});

describe("ManualBoundaryDrawer — locate me", () => {
  it("flies to the user's location on success", async () => {
    render(<ManualBoundaryDrawer plotId="p1" />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    await userEvent.click(screen.getByRole("button", { name: "Return to my location" }));
    await waitFor(() =>
      expect(getMap().flyTo).toHaveBeenCalledWith({ center: [90.4, 23.8], zoom: 17 }),
    );
  });

  it("shows an error when location permission is denied", async () => {
    mockGeolocation(false);
    render(<ManualBoundaryDrawer plotId="p1" />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    await userEvent.click(screen.getByRole("button", { name: "Return to my location" }));
    expect(
      await screen.findByText("Couldn't get your location — check location permission."),
    ).toBeInTheDocument();
  });
});

describe("ManualBoundaryDrawer — WebGL failure", () => {
  it("shows a fallback message when the map fails to construct", async () => {
    class ThrowingMap {
      constructor() {
        throw new Error("no webgl");
      }
    }
    vi.doMock("@/lib/map", () => ({
      default: { Map: ThrowingMap, Marker: class {}, NavigationControl: class {} },
    }));
    vi.resetModules();
    const { default: Drawer } = await import("./ManualBoundaryDrawer");
    render(<Drawer plotId="p1" />);
    expect(
      await screen.findByText(/Map couldn't load/),
    ).toBeInTheDocument();
  });
});
