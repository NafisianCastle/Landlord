import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./input";

describe("Input", () => {
  it("forwards a ref to the underlying <input>", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("accepts typed text and reports it via onChange", async () => {
    const onChange = vi.fn();
    render(<Input placeholder="Name" onChange={onChange} />);
    const input = screen.getByPlaceholderText("Name");
    await userEvent.type(input, "hello");
    expect(input).toHaveValue("hello");
    expect(onChange).toHaveBeenCalled();
  });

  it("respects the type prop", () => {
    render(<Input type="email" placeholder="Email" />);
    expect(screen.getByPlaceholderText("Email")).toHaveAttribute("type", "email");
  });

  it("is disabled and rejects input when disabled", async () => {
    render(<Input disabled placeholder="Name" defaultValue="" />);
    const input = screen.getByPlaceholderText("Name");
    expect(input).toBeDisabled();
    await userEvent.type(input, "hello");
    expect(input).toHaveValue("");
  });

  it("merges a custom className with the base classes", () => {
    render(<Input className="custom" placeholder="Name" />);
    expect(screen.getByPlaceholderText("Name")).toHaveClass("custom");
  });
});
