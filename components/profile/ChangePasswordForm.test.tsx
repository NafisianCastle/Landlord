import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/test/i18n";
import ChangePasswordForm from "./ChangePasswordForm";

const changePasswordMock = vi.fn();
vi.mock("@/app/actions/auth", () => ({
  changePassword: (...a: unknown[]) => changePasswordMock(...a),
}));

beforeEach(() => {
  vi.clearAllMocks();
  changePasswordMock.mockResolvedValue(undefined);
});

describe("ChangePasswordForm", () => {
  it("requires all three password fields with a 10-char minimum on the new ones", () => {
    render(<ChangePasswordForm />);
    expect(screen.getByLabelText("Current password")).toBeRequired();
    expect(screen.getByLabelText("New password")).toHaveAttribute("minlength", "10");
    expect(screen.getByLabelText("Confirm new password")).toHaveAttribute("minlength", "10");
  });

  it("submits and shows the success message", async () => {
    changePasswordMock.mockResolvedValue({ success: true });
    render(<ChangePasswordForm />);
    await userEvent.type(screen.getByLabelText("Current password"), "oldpassword1");
    await userEvent.type(screen.getByLabelText("New password"), "newpassword1");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "newpassword1");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("Password changed.")).toBeInTheDocument();
  });

  it("shows the server error message", async () => {
    changePasswordMock.mockResolvedValue({ error: "Current password is incorrect." });
    render(<ChangePasswordForm />);
    await userEvent.type(screen.getByLabelText("Current password"), "wrongpassword");
    await userEvent.type(screen.getByLabelText("New password"), "newpassword1");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "newpassword1");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("Current password is incorrect.")).toBeInTheDocument();
  });
});
