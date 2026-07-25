import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/test/i18n";

function mockMatchMedia(prefersDark: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: prefersDark });
}

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  document.documentElement.classList.remove("light", "dark");
  mockMatchMedia(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ThemeToggle", () => {
  it("defaults to the system preference (light) when nothing is stored", async () => {
    mockMatchMedia(false);
    const { default: ThemeToggle } = await import("./ThemeToggle");
    render(<ThemeToggle />);
    expect(await screen.findByRole("button", { name: "Toggle light/dark mode" })).toHaveTextContent(
      "Light",
    );
  });

  it("defaults to dark when the system prefers dark and nothing is stored", async () => {
    mockMatchMedia(true);
    const { default: ThemeToggle } = await import("./ThemeToggle");
    render(<ThemeToggle />);
    expect(await screen.findByText("Dark")).toBeInTheDocument();
  });

  it("respects a previously stored preference over the system one", async () => {
    localStorage.setItem("landlord-theme", "dark");
    mockMatchMedia(false);
    const { default: ThemeToggle } = await import("./ThemeToggle");
    render(<ThemeToggle />);
    expect(await screen.findByText("Dark")).toBeInTheDocument();
  });

  it("toggles the theme, persists it, and applies the class to <html>", async () => {
    const { default: ThemeToggle } = await import("./ThemeToggle");
    render(<ThemeToggle />);
    const button = await screen.findByRole("button");
    expect(button).toHaveTextContent("Light");

    await userEvent.click(button);
    expect(button).toHaveTextContent("Dark");
    expect(localStorage.getItem("landlord-theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);

    await userEvent.click(button);
    expect(button).toHaveTextContent("Light");
    expect(localStorage.getItem("landlord-theme")).toBe("light");
  });
});
