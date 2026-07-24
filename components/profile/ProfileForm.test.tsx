import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfileForm from "./ProfileForm";

const updateProfileMock = vi.fn();
vi.mock("@/app/actions/auth", () => ({
  updateProfile: (...a: unknown[]) => updateProfileMock(...a),
}));

beforeEach(() => {
  vi.clearAllMocks();
  updateProfileMock.mockResolvedValue(undefined);
});

describe("ProfileForm", () => {
  it("renders a disabled, read-only email field and an editable full name", () => {
    render(<ProfileForm email="a@b.com" fullName="Jane Doe" />);
    expect(screen.getByLabelText("Email")).toHaveValue("a@b.com");
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByLabelText("Full name")).toHaveValue("Jane Doe");
    expect(screen.getByLabelText("Full name")).not.toBeDisabled();
  });

  it("submits and shows the success message", async () => {
    updateProfileMock.mockResolvedValue({ success: true });
    render(<ProfileForm email="a@b.com" fullName="Jane" />);
    await userEvent.clear(screen.getByLabelText("Full name"));
    await userEvent.type(screen.getByLabelText("Full name"), "Jane Smith");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Profile updated.")).toBeInTheDocument();
  });

  it("shows the server error message", async () => {
    updateProfileMock.mockResolvedValue({ error: "Not authenticated." });
    render(<ProfileForm email="a@b.com" fullName="Jane" />);
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Not authenticated.")).toBeInTheDocument();
  });
});
