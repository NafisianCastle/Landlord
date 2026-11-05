import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import RentHistoryForm from "./RentHistoryForm";
const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@/app/actions/rentHistory", () => ({ recordRentHistory: mocks.save }));
const props = { leaseId: "lease", subjectType: "apartment" as const, subjectId: "property", startDate: "2022-01-31", endDate: null, currentMonth: "2026-10", payments: [
  { id: "paid", dueDate: "2022-02-28", paid: true, amount: 9000, paidAmount: 9000, paidDate: "2022-03-01" },
] };
function setup() {
  render(<NextIntlClientProvider locale="en" messages={en}><RentHistoryForm {...props} /></NextIntlClientProvider>);
  fireEvent.click(screen.getByText("Record past paid rent"));
}
beforeEach(() => { vi.clearAllMocks(); mocks.save.mockResolvedValue({ success: true, recorded: 23, skipped: 1 }); });
describe("RentHistoryForm", () => {
  it("previews multiple ranges, excludes paid months, and submits only explicit range values", async () => {
    setup();
    fireEvent.change(screen.getByLabelText("Through month"), { target: { value: "2022-12" } });
    fireEvent.change(screen.getByLabelText("Monthly rent (৳)"), { target: { value: "15000" } });
    fireEvent.click(screen.getByRole("button", { name: "Add another range" }));
    fireEvent.change(screen.getAllByLabelText("From month")[1], { target: { value: "2023-01" } });
    fireEvent.change(screen.getAllByLabelText("Through month")[1], { target: { value: "2023-12" } });
    fireEvent.change(screen.getAllByLabelText("Monthly rent (৳)")[1], { target: { value: "18000" } });
    expect(screen.getByText(/23 months will be marked paid/)).toHaveTextContent("381,000");
    expect(screen.getByText("1 already-paid month will be kept unchanged.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Record selected months as paid" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith("lease", "apartment", "property", [
      { from: "2022-01", to: "2022-12", amount: "15000" }, { from: "2023-01", to: "2023-12", amount: "18000" },
    ]));
    expect(await screen.findByRole("status")).toHaveTextContent("Recorded 23 months. Kept 1 already-paid month unchanged.");
  });
  it("prevents overlapping ranges and supports removing one", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Monthly rent (৳)"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Add another range" }));
    fireEvent.change(screen.getAllByLabelText("From month")[1], { target: { value: "2023-01" } });
    fireEvent.change(screen.getAllByLabelText("Through month")[1], { target: { value: "2023-12" } });
    fireEvent.change(screen.getAllByLabelText("Monthly rent (৳)")[1], { target: { value: "200" } });
    expect(screen.getByText(/Ranges cannot overlap/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record selected months as paid" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Remove range 2" }));
    expect(screen.getByRole("button", { name: "Record selected months as paid" })).toBeEnabled();
  });
  it("retains inputs and shows an error when saving fails", async () => {
    mocks.save.mockRejectedValue(new Error("network"));
    setup();
    fireEvent.change(screen.getByLabelText("Monthly rent (৳)"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Record selected months as paid" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not record rent history");
    expect(screen.getByLabelText("Monthly rent (৳)")).toHaveValue(100);
  });
});
