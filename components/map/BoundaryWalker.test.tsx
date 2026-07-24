import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BoundaryWalker from "./BoundaryWalker";

// --- fake maplibre-gl -------------------------------------------------
// A real MapLibre map needs WebGL, which jsdom doesn't provide. This fake
// implements just enough of the Map/Marker API surface BoundaryWalker uses,
// and records registered event handlers so tests can fire them directly
// (e.g. simulating a click on the "walk-points" layer).
// vi.mock factories are hoisted above imports, so the fakes must be built
// inside vi.hoisted() to avoid a temporal-dead-zone reference error.
const { FakeMap, FakeMarker, fakeMapInstances } = vi.hoisted(() => {
  class FakeMap {
    handlers: Record<string, Array<{ layer?: string; cb: (...args: unknown[]) => void }>> = {};
    sources: Record<string, { setData: ReturnType<typeof vi.fn> }> = {};
    removed = false;

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
      return { style: {} };
    }
    remove() {
      this.removed = true;
    }
  }

  class FakeMarker {
    lngLat: unknown = null;
    constructor(public opts: unknown) {}
    setLngLat(v: unknown) {
      this.lngLat = v;
      return this;
    }
    addTo() {
      return this;
    }
    remove() {}
  }

  const fakeMapInstances: InstanceType<typeof FakeMap>[] = [];
  return { FakeMap, FakeMarker, fakeMapInstances };
});

vi.mock("@/lib/map", () => ({
  default: {
    Map: FakeMap,
    Marker: FakeMarker,
    NavigationControl: class {},
  },
}));

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const resumeOrCreateSessionMock = vi.fn();
const recordPointMock = vi.fn();
const undoLastPointMock = vi.fn();
const deletePointAtMock = vi.fn();
const finishSessionMock = vi.fn();
const pendingCountMock = vi.fn();
const onSyncStateChangeMock = vi.fn(() => () => {});

vi.mock("@/lib/offline/syncQueue", () => ({
  resumeOrCreateSession: (...a: unknown[]) => resumeOrCreateSessionMock(...a),
  recordPoint: (...a: unknown[]) => recordPointMock(...a),
  undoLastPoint: (...a: unknown[]) => undoLastPointMock(...a),
  deletePointAt: (...a: unknown[]) => deletePointAtMock(...a),
  finishSession: (...a: unknown[]) => finishSessionMock(...a),
  pendingCount: (...a: unknown[]) => pendingCountMock(...a),
  onSyncStateChange: (...a: unknown[]) => onSyncStateChangeMock(...a),
}));

function mockGeolocation({
  succeed = true,
  lat = 23.8,
  lng = 90.4,
  accuracy = 5,
  errorMessage = "denied",
}: Partial<{
  succeed: boolean;
  lat: number;
  lng: number;
  accuracy: number;
  errorMessage: string;
}> = {}) {
  Object.defineProperty(global.navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn((success, error) => {
        if (succeed) {
          success({ coords: { latitude: lat, longitude: lng, accuracy } });
        } else {
          error({ message: errorMessage });
        }
      }),
      watchPosition: vi.fn(() => 1),
      clearWatch: vi.fn(),
    },
  });
}

beforeEach(() => {
  fakeMapInstances.length = 0;
  vi.clearAllMocks();
  resumeOrCreateSessionMock.mockResolvedValue({
    session: { id: "s1" },
    points: [],
  });
  pendingCountMock.mockResolvedValue(0);
  recordPointMock.mockResolvedValue(undefined);
  undoLastPointMock.mockResolvedValue(undefined);
  deletePointAtMock.mockResolvedValue(undefined);
  finishSessionMock.mockResolvedValue({ finished: [] });
  mockGeolocation();
  Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BoundaryWalker", () => {
  it("resumes/creates the session and renders the initial point count", async () => {
    render(<BoundaryWalker plotId="p1" />);
    expect(resumeOrCreateSessionMock).toHaveBeenCalledWith("p1");
    expect(await screen.findByRole("button", { name: "Finish (0 points)" })).toBeInTheDocument();
  });

  it("restores previously-captured points from an existing session", async () => {
    resumeOrCreateSessionMock.mockResolvedValue({
      session: { id: "s1" },
      points: [
        { lat: 1, lng: 1 },
        { lat: 2, lng: 2 },
      ],
    });
    render(<BoundaryWalker plotId="p1" />);
    expect(await screen.findByRole("button", { name: "Finish (2 points)" })).toBeInTheDocument();
  });

  it("marks a GPS point on success and appends it to the walk", async () => {
    render(<BoundaryWalker plotId="p1" />);
    await screen.findByRole("button", { name: "Finish (0 points)" });
    await userEvent.click(screen.getByRole("button", { name: "Mark point" }));
    await waitFor(() =>
      expect(recordPointMock).toHaveBeenCalledWith("s1", "p1", 0, 23.8, 90.4, 5),
    );
    expect(await screen.findByRole("button", { name: "Finish (1 points)" })).toBeInTheDocument();
  });

  it("shows the geolocation error message when marking a point fails", async () => {
    mockGeolocation({ succeed: false, errorMessage: "User denied Geolocation" });
    render(<BoundaryWalker plotId="p1" />);
    await screen.findByRole("button", { name: "Finish (0 points)" });
    await userEvent.click(screen.getByRole("button", { name: "Mark point" }));
    expect(await screen.findByText("User denied Geolocation")).toBeInTheDocument();
  });

  it("disables Mark point until the session id is loaded", () => {
    resumeOrCreateSessionMock.mockReturnValue(new Promise(() => {})); // never resolves
    render(<BoundaryWalker plotId="p1" />);
    expect(screen.getByRole("button", { name: "Mark point" })).toBeDisabled();
  });

  it("undoes the last point", async () => {
    resumeOrCreateSessionMock.mockResolvedValue({
      session: { id: "s1" },
      points: [{ lat: 1, lng: 1 }],
    });
    render(<BoundaryWalker plotId="p1" />);
    await screen.findByRole("button", { name: "Finish (1 points)" });
    await userEvent.click(screen.getByRole("button", { name: "Undo last" }));
    expect(undoLastPointMock).toHaveBeenCalledWith("s1");
    expect(await screen.findByRole("button", { name: "Finish (0 points)" })).toBeInTheDocument();
  });

  it("disables Undo last and Finish when there are no points", async () => {
    render(<BoundaryWalker plotId="p1" />);
    await screen.findByRole("button", { name: "Finish (0 points)" });
    expect(screen.getByRole("button", { name: "Undo last" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Finish (0 points)" })).toBeDisabled();
  });

  it("keeps Finish disabled with fewer than 3 points", async () => {
    resumeOrCreateSessionMock.mockResolvedValue({
      session: { id: "s1" },
      points: [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }],
    });
    render(<BoundaryWalker plotId="p1" />);
    expect(await screen.findByRole("button", { name: "Finish (2 points)" })).toBeDisabled();
  });

  it("finishes and refreshes the router when the session completes synchronously", async () => {
    resumeOrCreateSessionMock.mockResolvedValue({
      session: { id: "s1" },
      points: [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, { lat: 1, lng: 1 }],
    });
    finishSessionMock.mockResolvedValue({ finished: ["p1"] });
    render(<BoundaryWalker plotId="p1" />);
    const finishBtn = await screen.findByRole("button", { name: "Finish (3 points)" });
    await userEvent.click(finishBtn);
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("shows a queued message when finish is saved locally but not yet synced", async () => {
    resumeOrCreateSessionMock.mockResolvedValue({
      session: { id: "s1" },
      points: [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, { lat: 1, lng: 1 }],
    });
    finishSessionMock.mockResolvedValue({ finished: [] });
    render(<BoundaryWalker plotId="p1" />);
    const finishBtn = await screen.findByRole("button", { name: "Finish (3 points)" });
    await userEvent.click(finishBtn);
    expect(
      await screen.findByText(
        "Saved on this device — will finish syncing once you're back online.",
      ),
    ).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("shows an offline banner and pending-sync count", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    pendingCountMock.mockResolvedValue(2);
    render(<BoundaryWalker plotId="p1" />);
    expect(await screen.findByText(/Offline — points are saved/)).toBeInTheDocument();
    expect(await screen.findByText("2 point(s) waiting to sync.")).toBeInTheDocument();
  });

  it("removes a tapped point on the map after confirming", async () => {
    resumeOrCreateSessionMock.mockResolvedValue({
      session: { id: "s1" },
      points: [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, { lat: 1, lng: 1 }],
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<BoundaryWalker plotId="p1" />);
    await screen.findByRole("button", { name: "Finish (3 points)" });

    const map = fakeMapInstances[0];
    map.fire("load");
    await map.fire("click", { features: [{ properties: { index: 1 } }] });

    expect(deletePointAtMock).toHaveBeenCalledWith("s1", 1);
    expect(await screen.findByRole("button", { name: "Finish (2 points)" })).toBeInTheDocument();
  });

  it("does not remove a tapped point when the user declines the confirm dialog", async () => {
    resumeOrCreateSessionMock.mockResolvedValue({
      session: { id: "s1" },
      points: [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, { lat: 1, lng: 1 }],
    });
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<BoundaryWalker plotId="p1" />);
    await screen.findByRole("button", { name: "Finish (3 points)" });

    const map = fakeMapInstances[0];
    await map.fire("click", { features: [{ properties: { index: 1 } }] });

    expect(deletePointAtMock).not.toHaveBeenCalled();
  });

  it("cleans up the map and geolocation watch on unmount", async () => {
    const { unmount } = render(<BoundaryWalker plotId="p1" />);
    await screen.findByRole("button", { name: "Finish (0 points)" });
    const map = fakeMapInstances[0];
    expect(map.removed).toBe(false);
    unmount();
    expect(map.removed).toBe(true);
    expect(global.navigator.geolocation.clearWatch).toHaveBeenCalledWith(1);
  });
});
