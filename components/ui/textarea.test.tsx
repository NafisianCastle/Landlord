import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("forwards a ref to the underlying <textarea>", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("accepts multi-line typed text", async () => {
    render(<Textarea placeholder="Notes" />);
    const textarea = screen.getByPlaceholderText("Notes");
    await userEvent.type(textarea, "line1{enter}line2");
    expect(textarea).toHaveValue("line1\nline2");
  });

  it("is disabled and rejects input when disabled", async () => {
    render(<Textarea disabled placeholder="Notes" defaultValue="" />);
    const textarea = screen.getByPlaceholderText("Notes");
    expect(textarea).toBeDisabled();
    await userEvent.type(textarea, "x");
    expect(textarea).toHaveValue("");
  });

  it("merges a custom className with the base classes", () => {
    render(<Textarea className="custom" placeholder="Notes" />);
    expect(screen.getByPlaceholderText("Notes")).toHaveClass("custom");
  });
});
