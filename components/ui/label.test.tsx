import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Label } from "./label";

describe("Label", () => {
  it("renders its text and forwards a ref", () => {
    const ref = createRef<HTMLLabelElement>();
    render(<Label ref={ref}>Full name</Label>);
    expect(screen.getByText("Full name")).toBeInTheDocument();
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });

  it("associates with a control via htmlFor", () => {
    render(
      <>
        <Label htmlFor="name-input">Full name</Label>
        <input id="name-input" />
      </>,
    );
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
  });

  it("merges a custom className with the base classes", () => {
    render(<Label className="custom">X</Label>);
    expect(screen.getByText("X")).toHaveClass("custom");
  });
});
