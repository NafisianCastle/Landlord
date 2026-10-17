import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/test/i18n";
import EditVendorButton from "./EditVendorButton";

const updateVendorMock = vi.fn();

vi.mock("@/app/actions/vendors", () => ({
  updateVendor: (...args: unknown[]) => updateVendorMock(...args),
}));

const vendor = { id: "v1", name: "Karim", trade: "Plumber", phone: "01700000000", notes: null };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EditVendorButton", () => {
  it("opens a dialog pre-filled with the vendor's details", async () => {
    render(<EditVendorButton vendor={vendor} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByRole("dialog", { name: "Edit vendor" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Karim");
    expect(screen.getByLabelText("Trade")).toHaveValue("Plumber");
    expect(screen.getByLabelText("Phone")).toHaveValue("01700000000");
    expect(screen.getByLabelText("Notes")).toHaveValue("");
  });

  it("saves the edited fields for this vendor and closes on success", async () => {
    updateVendorMock.mockResolvedValue({ success: true });
    render(<EditVendorButton vendor={vendor} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    const name = screen.getByLabelText("Name");
    await userEvent.clear(name);
    await userEvent.type(name, "Karim Uddin");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateVendorMock).toHaveBeenCalledTimes(1));
    const [vendorId, , formData] = updateVendorMock.mock.calls[0] as [string, unknown, FormData];
    expect(vendorId).toBe("v1");
    expect(formData.get("name")).toBe("Karim Uddin");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps the dialog open and shows the error when saving fails", async () => {
    updateVendorMock.mockResolvedValue({ error: "Name is required" });
    render(<EditVendorButton vendor={vendor} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
