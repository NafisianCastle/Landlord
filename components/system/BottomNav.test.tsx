import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/test/i18n";
import BottomNav from "./BottomNav";

const usePathnameMock = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

describe("BottomNav", () => {
  it("renders a link for every nav item", () => {
    usePathnameMock.mockReturnValue("/dashboard");
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /Dashboard/ })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: /Plots/ })).toHaveAttribute("href", "/plots");
    expect(screen.getByRole("link", { name: /Profile/ })).toHaveAttribute("href", "/profile");
  });

  it("marks the exact-match route as active", () => {
    usePathnameMock.mockReturnValue("/plots");
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /Plots/ }).className).toContain("text-primary");
    expect(screen.getByRole("link", { name: /Dashboard/ }).className).toContain(
      "text-muted-foreground",
    );
  });

  it("marks a nested route (e.g. /plots/123) as active for /plots", () => {
    usePathnameMock.mockReturnValue("/plots/123");
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /Plots/ }).className).toContain("text-primary");
  });

  it("does not treat an unrelated route with the same prefix as active", () => {
    usePathnameMock.mockReturnValue("/plotsomethingelse");
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /Plots/ }).className).toContain(
      "text-muted-foreground",
    );
  });
});
