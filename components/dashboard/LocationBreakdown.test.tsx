import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/test/i18n";
import LocationBreakdown from "./LocationBreakdown";

describe("LocationBreakdown", () => {
  it("shows a placeholder when there are no districts", () => {
    render(<LocationBreakdown districts={[]} />);
    expect(screen.getByText("No plots yet.")).toBeInTheDocument();
  });

  it("lists each district with singular/plural plot count and converted area", () => {
    render(
      <LocationBreakdown
        districts={[
          { district: "Dhaka", plotCount: 1, totalAreaSqMeters: 40.4686 },
          { district: "Chattogram", plotCount: 3, totalAreaSqMeters: 80.9372 },
        ]}
      />,
    );
    expect(screen.getByText("Dhaka")).toBeInTheDocument();
    expect(screen.getByText("1 plot · 1.00 decimal")).toBeInTheDocument();
    expect(screen.getByText("Chattogram")).toBeInTheDocument();
    expect(screen.getByText("3 plots · 2.00 decimal")).toBeInTheDocument();
  });
});
