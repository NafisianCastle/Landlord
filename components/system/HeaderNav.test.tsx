import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/test/i18n";
import HeaderNav from "./HeaderNav";

const usePathnameMock = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

describe("HeaderNav", () => {
  it("renders a link for every nav item", () => {
    usePathnameMock.mockReturnValue("/dashboard");
    render(<HeaderNav />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: "Plots" })).toHaveAttribute("href", "/plots");
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profile");
  });

  it("marks the active route with the foreground/medium-weight styling", () => {
    usePathnameMock.mockReturnValue("/profile");
    render(<HeaderNav />);
    expect(screen.getByRole("link", { name: "Profile" }).className).toContain(
      "font-medium",
    );
    expect(screen.getByRole("link", { name: "Dashboard" }).className).toContain(
      "text-muted-foreground",
    );
  });

  it("marks a nested route as active for its parent nav item", () => {
    usePathnameMock.mockReturnValue("/plots/abc/edit");
    render(<HeaderNav />);
    expect(screen.getByRole("link", { name: "Plots" }).className).toContain("font-medium");
  });
});
