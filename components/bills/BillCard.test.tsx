import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n";
import type { ApartmentBill, BillProof } from "@/lib/bills";
import BillCard from "./BillCard";

const review = vi.fn().mockResolvedValue({ success: true });
const submit = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/app/actions/bills", () => ({ reviewBillProof: (...args: unknown[]) => review(...args),
  submitBillProof: (...args: unknown[]) => submit(...args), createApartmentBill: vi.fn(), setBillVisibility: vi.fn() }));
const bill: ApartmentBill = { id:"40000000-0000-0000-0000-000000000001", apartment_id:"apartment", owner_id:"owner", tenant_share_id:"share", tenant_email:"tenant@example.test", title:"October electricity", amount:1200.50, due_date:"2026-10-31", visible_to_tenant:true, file_name:"bill.png", paid_at:null };
const proof: BillProof = { id:"proof", bill_id:bill.id, file_name:"receipt.png", status:"pending", review_note:null, created_at:"2026-10-20T10:00:00Z" };

describe("tenant bill workflow", () => {
  it("shows proof upload but no owner controls to the tenant", () => {
    renderWithIntl(<BillCard bill={bill} proofs={[]} isOwner={false} />);
    expect(screen.getByText("Upload payment proof", {selector:"summary"})).toBeInTheDocument();
    expect(screen.queryByRole("button", {name:"Approve & mark paid"})).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {name:"Hide from tenant"})).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name:/View bill copy/ })).toHaveAttribute("href",`/api/bills/files/${bill.id}`);
  });
  it("keeps a submitted proof pending and prevents a duplicate upload", () => {
    renderWithIntl(<BillCard bill={bill} proofs={[proof]} isOwner={false} />);
    expect(screen.getByText("Awaiting review")).toBeInTheDocument();
    expect(screen.queryByText("Upload payment proof")).not.toBeInTheDocument();
    expect(screen.getByText(/Uploading proof does not mark a bill paid/)).toBeInTheDocument();
  });
  it("lets the owner approve the specific pending proof", async () => {
    renderWithIntl(<BillCard bill={bill} proofs={[proof]} isOwner />);
    fireEvent.click(screen.getByRole("button",{name:"Approve & mark paid"}));
    await waitFor(() => expect(review).toHaveBeenCalledWith("proof",true,undefined,expect.any(FormData)));
  });
  it("shows rejection reasons and allows the tenant to submit another proof", () => {
    renderWithIntl(<BillCard bill={bill} proofs={[{...proof,status:"rejected",review_note:"Amount unreadable"}]} isOwner={false} />);
    expect(screen.getByText("Owner’s review: Amount unreadable")).toBeInTheDocument();
    expect(screen.getByText("Upload payment proof", {selector:"summary"})).toBeInTheDocument();
  });
  it("shows a paid bill without further upload or review controls", () => {
    renderWithIntl(<BillCard bill={{...bill,paid_at:"2026-10-21T10:00:00Z"}} proofs={[{...proof,status:"approved"}]} isOwner={false} />);
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.queryByText("Upload payment proof")).not.toBeInTheDocument();
  });
});
