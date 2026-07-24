import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("renders with the pulse animation class", () => {
    render(<Skeleton data-testid="skel" />);
    expect(screen.getByTestId("skel")).toHaveClass("animate-pulse");
  });

  it("merges a custom className, e.g. for width/height", () => {
    render(<Skeleton data-testid="skel" className="h-4 w-32" />);
    const el = screen.getByTestId("skel");
    expect(el).toHaveClass("h-4");
    expect(el).toHaveClass("w-32");
    expect(el).toHaveClass("animate-pulse");
  });

  it("forwards arbitrary props like aria-label", () => {
    render(<Skeleton data-testid="skel" aria-label="loading" />);
    expect(screen.getByTestId("skel")).toHaveAttribute("aria-label", "loading");
  });
});
