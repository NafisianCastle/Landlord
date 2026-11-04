import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import PaymentsList from "./PaymentsList";
vi.mock("@/app/actions/leases", () => ({ recordPayment: vi.fn(), unmarkPayment: vi.fn() }));
it("labels imported rent without inventing a receipt date and retains actual payment dates", () => {
  render(<NextIntlClientProvider locale="en" messages={messages}>
    <PaymentsList subjectType="apartment" subjectId="property" payments={[
      {id:"historical", dueDate:"2023-01-31",amount:15000,paidAmount:14000,paid:true,paidDate:null,notes:"Cash receipt 12"},
      {id:"regular",dueDate:"2023-02-28",amount:15000,paidAmount:15000,paid:true,paidDate:"2023-03-01"},
    ]} />
  </NextIntlClientProvider>);
  expect(screen.getByText("Paid · payment date not recorded")).toBeInTheDocument();
  expect(screen.getByText("Received 2023-03-01")).toBeInTheDocument();
  expect(screen.getByText(/Paid amount:/)).toHaveTextContent("BDT 14,000");
  expect(screen.getByText("Cash receipt 12")).toBeInTheDocument();
});
