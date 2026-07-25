import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Polygon } from "geojson";
import { renderWithIntl as render } from "@/test/i18n";
import PlotMap from "./PlotMap";

const { FakeMap, FakeLngLatBounds, fakeMapInstances } = vi.hoisted(() => {
  class FakeLngLatBounds {
    points: [number, number][] = [];
    extend(p: [number, number]) {
      this.points.push(p);
      return this;
    }
  }

  class FakeMap {
    handlers: Record<string, Array<{ layer?: string; cb: (...args: unknown[]) => void }>> = {};
    sources: Record<string, { setData: ReturnType<typeof vi.fn> }> = {};
    removed = false;
    fitBounds = vi.fn();
    canvasStyle: Record<string, string> = {};
    zoom = 6;
    boundsBox = { west: -1, south: -1, east: 1, north: 1 };

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
    setStyle() {
      this.fire("style.load");
    }
    isStyleLoaded() {
      return true;
    }
    getCanvas() {
      return { style: this.canvasStyle };
    }
    getBounds() {
      const b = this.boundsBox;
      return {
        getWest: () => b.west,
        getSouth: () => b.south,
        getEast: () => b.east,
        getNorth: () => b.north,
      };
    }
    getZoom() {
      return this.zoom;
    }
    remove() {
      this.removed = true;
    }
  }

  const fakeMapInstances: InstanceType<typeof FakeMap>[] = [];
  return { FakeMap, FakeLngLatBounds, fakeMapInstances };
});

vi.mock("@/lib/map", () => ({
  default: {
    Map: FakeMap,
    NavigationControl: class {},
    LngLatBounds: FakeLngLatBounds,
  },
}));

const { offlineAreasMock } = vi.hoisted(() => {
  const offlineAreasMock: Record<string, ReturnType<typeof vi.fn>> = {};
  offlineAreasMock.orderBy = vi.fn(() => offlineAreasMock);
  offlineAreasMock.reverse = vi.fn(() => offlineAreasMock);
  offlineAreasMock.toArray = vi.fn(async () => [] as unknown[]);
  offlineAreasMock.add = vi.fn(async () => undefined);
  offlineAreasMock.delete = vi.fn(async () => undefined);
  return { offlineAreasMock };
});
vi.mock("@/lib/offline/db", () => ({
  default: { offlineAreas: offlineAreasMock },
}));

const { downloadAreaMock, deleteAreaMock, estimateTileCountMock, FakeAreaTooLargeError } =
  vi.hoisted(() => {
    class FakeAreaTooLargeError extends Error {}
    return {
      downloadAreaMock: vi.fn(),
      deleteAreaMock: vi.fn(),
      estimateTileCountMock: vi.fn((..._unusedArgs: unknown[]) => 10),
      FakeAreaTooLargeError,
    };
  });
vi.mock("@/lib/offline/tileDownload", () => ({
  downloadArea: (...a: unknown[]) => downloadAreaMock(...a),
  deleteArea: (...a: unknown[]) => deleteAreaMock(...a),
  estimateTileCount: (...a: unknown[]) => estimateTileCountMock(...a),
  AreaTooLargeError: FakeAreaTooLargeError,
}));

const polygon: Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [0, 0],
    ],
  ],
};

function getMap() {
  return fakeMapInstances[0];
}

beforeEach(() => {
  fakeMapInstances.length = 0;
  vi.clearAllMocks();
  offlineAreasMock.toArray.mockResolvedValue([]);
  downloadAreaMock.mockResolvedValue({ tileCount: 10, bytesStored: 2048 });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PlotMap — rendering and loading", () => {
  it("attaches layers and fits bounds once the map loads", async () => {
    render(<PlotMap plots={[{ id: "p1", name: "Plot 1", boundary: polygon }]} />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = getMap();
    map.fire("load");
    expect(map.sources.plots).toBeDefined();
    expect(map.fitBounds).toHaveBeenCalled();
  });

  it("fires onPlotClick with the clicked plot's id", async () => {
    const onPlotClick = vi.fn();
    render(
      <PlotMap
        plots={[{ id: "p1", name: "Plot 1", boundary: polygon }]}
        onPlotClick={onPlotClick}
      />,
    );
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    const map = getMap();
    map.fire("load");
    map.fire("click", { features: [{ properties: { id: "p1" } }] });
    expect(onPlotClick).toHaveBeenCalledWith("p1");
  });

  it("loads previously downloaded offline areas on mount", async () => {
    offlineAreasMock.toArray.mockResolvedValue([
      {
        id: "a1",
        label: "Area 1",
        west: 0,
        south: 0,
        east: 1,
        north: 1,
        minZoom: 10,
        maxZoom: 14,
        tileCount: 50,
        bytesStored: 1024 * 1024 * 2,
        downloadedAt: 1,
      },
    ]);
    render(<PlotMap plots={[]} />);
    expect(await screen.findByText(/Area 1/)).toBeInTheDocument();
    expect(screen.getByText(/2\.0 MB, 50 tiles/)).toBeInTheDocument();
  });
});

describe("PlotMap — base style toggle and offline download", () => {
  it("only shows the download button on satellite style", async () => {
    render(<PlotMap plots={[]} />);
    expect(
      screen.queryByRole("button", { name: "Download this view offline" }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Satellite" }));
    expect(
      screen.getByRole("button", { name: "Download this view offline" }),
    ).toBeInTheDocument();
  });

  it("downloads the current view and lists it as an offline area on success", async () => {
    render(<PlotMap plots={[]} />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    await userEvent.click(screen.getByRole("button", { name: "Satellite" }));
    await userEvent.click(screen.getByRole("button", { name: "Download this view offline" }));

    await waitFor(() => expect(downloadAreaMock).toHaveBeenCalled());
    expect(await screen.findByText(/Area downloaded/)).toBeInTheDocument();
  });

  it("shows the AreaTooLargeError message when the download is rejected as too large", async () => {
    downloadAreaMock.mockRejectedValue(new FakeAreaTooLargeError("Too many tiles"));
    render(<PlotMap plots={[]} />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    await userEvent.click(screen.getByRole("button", { name: "Satellite" }));
    await userEvent.click(screen.getByRole("button", { name: "Download this view offline" }));
    expect(await screen.findByText("Too many tiles")).toBeInTheDocument();
  });

  it("shows a generic error message on a non-abort download failure", async () => {
    downloadAreaMock.mockRejectedValue(new Error("network down"));
    render(<PlotMap plots={[]} />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    await userEvent.click(screen.getByRole("button", { name: "Satellite" }));
    await userEvent.click(screen.getByRole("button", { name: "Download this view offline" }));
    expect(
      await screen.findByText("Download failed — check your connection and try again."),
    ).toBeInTheDocument();
  });

  it("shows no error message when the download is aborted (cancel)", async () => {
    let rejectFn: (e: Error) => void;
    downloadAreaMock.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectFn = reject;
      }),
    );
    render(<PlotMap plots={[]} />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    await userEvent.click(screen.getByRole("button", { name: "Satellite" }));
    await userEvent.click(screen.getByRole("button", { name: "Download this view offline" }));
    await screen.findByRole("button", { name: "Cancel" });
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    rejectFn!(abortError);
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Download this view offline" }),
      ).toBeEnabled(),
    );
    expect(
      screen.queryByText("Download failed — check your connection and try again."),
    ).not.toBeInTheDocument();
  });

  it("removes an offline area and deletes its tiles", async () => {
    offlineAreasMock.toArray.mockResolvedValue([
      {
        id: "a1",
        label: "Area 1",
        west: 0,
        south: 0,
        east: 1,
        north: 1,
        minZoom: 10,
        maxZoom: 14,
        tileCount: 50,
        bytesStored: 1024,
        downloadedAt: 1,
      },
    ]);
    render(<PlotMap plots={[]} />);
    await screen.findByText(/Area 1/);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(deleteAreaMock).toHaveBeenCalled();
    expect(offlineAreasMock.delete).toHaveBeenCalledWith("a1");
    await waitFor(() => expect(screen.queryByText(/Area 1/)).not.toBeInTheDocument());
  });

  it("navigates the map to a saved area's bounds when clicked", async () => {
    offlineAreasMock.toArray.mockResolvedValue([
      {
        id: "a1",
        label: "Area 1",
        west: 0,
        south: 0,
        east: 1,
        north: 1,
        minZoom: 10,
        maxZoom: 14,
        tileCount: 50,
        bytesStored: 1024,
        downloadedAt: 1,
      },
    ]);
    render(<PlotMap plots={[]} />);
    await waitFor(() => expect(fakeMapInstances.length).toBe(1));
    await screen.findByText(/Area 1/);
    await userEvent.click(screen.getByText(/Area 1/));
    expect(getMap().fitBounds).toHaveBeenCalledWith(
      [
        [0, 0],
        [1, 1],
      ],
      { padding: 24 },
    );
  });
});

describe("PlotMap — WebGL failure", () => {
  it("shows a fallback message when the map fails to construct", async () => {
    class ThrowingMap {
      constructor() {
        throw new Error("no webgl");
      }
    }
    vi.doMock("@/lib/map", () => ({
      default: { Map: ThrowingMap, NavigationControl: class {}, LngLatBounds: FakeLngLatBounds },
    }));
    vi.resetModules();
    const { default: FreshPlotMap } = await import("./PlotMap");
    render(<FreshPlotMap plots={[]} />);
    expect(await screen.findByText(/Map couldn't load/)).toBeInTheDocument();
  });
});
