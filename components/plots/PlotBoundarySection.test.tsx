import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Polygon } from "geojson";
import { renderWithIntl as render } from "@/test/i18n";
import PlotBoundarySection from "./PlotBoundarySection";

vi.mock("@/components/map/PlotMap", () => ({
  default: ({ plots }: { plots: { id: string }[] }) => (
    <div data-testid="plot-map">Map with {plots.length} plot(s)</div>
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
  it("shows the manual drawer when there is no boundary yet", async () => {
    render(<PlotBoundarySection plotId="p1" plotName="Plot" boundary={null} />);
    expect(await screen.findByTestId("manual-drawer")).toBeInTheDocument();
    expect(screen.queryByTestId("plot-map")).not.toBeInTheDocument();
  });

  it("renders the map with the redraw button when a boundary already exists", async () => {
    render(<PlotBoundarySection plotId="p1" plotName="Plot" boundary={polygon} />);
    expect(await screen.findByTestId("plot-map")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Redraw boundary" })).toBeInTheDocument();
  });

  it("switches to the manual drawer when 'Redraw boundary' is clicked", async () => {
    render(<PlotBoundarySection plotId="p1" plotName="Plot" boundary={polygon} />);
    await userEvent.click(screen.getByRole("button", { name: "Redraw boundary" }));
    expect(screen.getByTestId("manual-drawer")).toBeInTheDocument();
    expect(screen.queryByTestId("plot-map")).not.toBeInTheDocument();
  });

  it("passes the plot id/name/boundary through to PlotMap as a single-plot list", async () => {
    render(<PlotBoundarySection plotId="p1" plotName="Plot" boundary={polygon} />);
    expect(await screen.findByText("Map with 1 plot(s)")).toBeInTheDocument();
  });
});
