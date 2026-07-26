import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/test/i18n";
import Sidebar from "./Sidebar";

const usePathnameMock = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock("@/app/actions/auth", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/components/system/ThemeToggle", () => ({
  default: () => null,
}));

vi.mock("@/components/system/LocaleSwitcher", () => ({
  default: () => null,
}));

describe("Sidebar", () => {
  it("renders a link for every nav item", () => {
    usePathnameMock.mockReturnValue("/dashboard");
    render(<Sidebar signedIn />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: "Plots" })).toHaveAttribute("href", "/plots");
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profile");
  });

  it("marks the active route with the highlighted/medium-weight styling", () => {
    usePathnameMock.mockReturnValue("/profile");
    render(<Sidebar signedIn />);
    expect(screen.getByRole("link", { name: "Profile" }).className).toContain(
      "font-medium",
    );
    expect(screen.getByRole("link", { name: "Dashboard" }).className).toContain(
      "text-muted-foreground",
    );
  });

  it("marks a nested route as active for its parent nav item", () => {
    usePathnameMock.mockReturnValue("/plots/abc/edit");
    render(<Sidebar signedIn />);
    expect(screen.getByRole("link", { name: "Plots" }).className).toContain("font-medium");
  });

  it("shows a sign-out button only when signed in", () => {
    usePathnameMock.mockReturnValue("/dashboard");
    const { rerender } = render(<Sidebar signedIn={false} />);
    expect(screen.queryByRole("button", { name: /Log out/i })).not.toBeInTheDocument();

    rerender(<Sidebar signedIn />);
    expect(screen.getByRole("button", { name: /Log out/i })).toBeInTheDocument();
  });
});
