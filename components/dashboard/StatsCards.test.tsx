import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/test/i18n";
import StatsCards from "./StatsCards";

describe("StatsCards", () => {
  it("renders plot count and formatted BDT currency values", () => {
    render(
      <StatsCards
        plotCount={5}
        totalAreaSqMeters={404.686}
        totalPurchasePrice={100000}
        totalCurrentValue={150000}
        documentCount={3}
      />,
    );
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("10.00 decimal")).toBeInTheDocument();
    expect(screen.getByText(/৳100,000|BDT\s?100,000/)).toBeInTheDocument();
  });

  it("shows a positive delta with a + sign and percentage when value increased", () => {
    render(
      <StatsCards
        plotCount={1}
        totalAreaSqMeters={0}
        totalPurchasePrice={100000}
        totalCurrentValue={150000}
        documentCount={3}
      />,
    );
    expect(screen.getByText(/\+.*\(\+50\.0%\)/)).toBeInTheDocument();
  });

  it("shows a negative delta without a duplicated minus sign", () => {
    render(
      <StatsCards
        plotCount={1}
        totalAreaSqMeters={0}
        totalPurchasePrice={100000}
        totalCurrentValue={80000}
        documentCount={0}
      />,
    );
    expect(screen.getByText(/\(-20\.0%\)/)).toBeInTheDocument();
  });

  it("omits the delta sub-line when purchase price is 0 (no division by zero)", () => {
    render(
      <StatsCards
        plotCount={1}
        totalAreaSqMeters={0}
        totalPurchasePrice={0}
        totalCurrentValue={5000}
        documentCount={0}
      />,
    );
    expect(screen.queryByText(/%\)/)).not.toBeInTheDocument();
  });

  it("renders zero values without crashing", () => {
    render(
      <StatsCards
        plotCount={0}
        totalAreaSqMeters={0}
        totalPurchasePrice={0}
        totalCurrentValue={0}
        documentCount={0}
      />,
    );
    expect(screen.getAllByText("0")).toHaveLength(2);
    expect(screen.getByText("0.00 decimal")).toBeInTheDocument();
  });
});
