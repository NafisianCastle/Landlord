import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Polygon } from "geojson";
import PlotBoundarySection from "./PlotBoundarySection";

vi.mock("@/components/map/PlotMap", () => ({
  default: ({ plots }: { plots: { id: string }[] }) => (
    <div data-testid="plot-map">Map with {plots.length} plot(s)</div>
  ),
}));
vi.mock("@/components/map/BoundaryWalker", () => ({
  default: ({ plotId }: { plotId: string }) => (
    <div data-testid="boundary-walker">Walker for {plotId}</div>
  ),
}));
vi.mock("@/components/map/ManualBoundaryDrawer", () => ({
  default: ({ plotId }: { plotId: string }) => (
    <div data-testid="manual-drawer">Drawer for {plotId}</div>
  ),
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

describe("PlotBoundarySection", () => {
  it("shows the GPS walker by default when there is no boundary yet", () => {
    render(<PlotBoundarySection plotId="p1" plotName="Plot" boundary={null} />);
    expect(screen.getByTestId("boundary-walker")).toBeInTheDocument();
    expect(screen.queryByTestId("manual-drawer")).not.toBeInTheDocument();
    expect(screen.queryByTestId("plot-map")).not.toBeInTheDocument();
  });

  it("switches to the manual drawer when 'Draw on map' is clicked", async () => {
    render(<PlotBoundarySection plotId="p1" plotName="Plot" boundary={null} />);
    await userEvent.click(screen.getByRole("button", { name: "Draw on map" }));
    expect(screen.getByTestId("manual-drawer")).toBeInTheDocument();
    expect(screen.queryByTestId("boundary-walker")).not.toBeInTheDocument();
  });

  it("switches back to GPS walker when 'Walk with GPS' is clicked after switching away", async () => {
    render(<PlotBoundarySection plotId="p1" plotName="Plot" boundary={null} />);
    await userEvent.click(screen.getByRole("button", { name: "Draw on map" }));
    await userEvent.click(screen.getByRole("button", { name: "Walk with GPS" }));
    expect(screen.getByTestId("boundary-walker")).toBeInTheDocument();
  });

  it("renders the map with the redraw button when a boundary already exists", () => {
    render(<PlotBoundarySection plotId="p1" plotName="Plot" boundary={polygon} />);
    expect(screen.getByTestId("plot-map")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Redraw boundary" })).toBeInTheDocument();
  });

  it("switches to the walker/drawer picker when 'Redraw boundary' is clicked", async () => {
    render(<PlotBoundarySection plotId="p1" plotName="Plot" boundary={polygon} />);
    await userEvent.click(screen.getByRole("button", { name: "Redraw boundary" }));
    expect(screen.getByTestId("boundary-walker")).toBeInTheDocument();
    expect(screen.queryByTestId("plot-map")).not.toBeInTheDocument();
  });

  it("passes the plot id/name/boundary through to PlotMap as a single-plot list", () => {
    render(<PlotBoundarySection plotId="p1" plotName="Plot" boundary={polygon} />);
    expect(screen.getByText("Map with 1 plot(s)")).toBeInTheDocument();
  });
});
