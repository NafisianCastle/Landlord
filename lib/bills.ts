export interface TenantShare {
  id: string;
  apartment_id: string;
  owner_id: string;
  user_id: string;
  invited_email: string;
  apartment_label: string;
}
export interface BillProof {
  id: string;
  bill_id: string;
  file_name: string;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  created_at: string;
}
export interface ApartmentBill {
  id: string;
  apartment_id: string;
  owner_id: string;
  tenant_share_id: string | null;
  tenant_email: string;
  title: string;
  amount: number;
  due_date: string;
  visible_to_tenant: boolean;
  file_name: string | null;
  paid_at: string | null;
}
export function billStatus(bill: Pick<ApartmentBill, "paid_at" | "due_date">, proofs: BillProof[], today = new Date().toISOString().slice(0,10)) {
  if (bill.paid_at) return "paid";
  if (proofs.some(p => p.status === "pending")) return "pending";
  return bill.due_date < today ? "overdue" : "unpaid";
}
export function billHorizon() {
  return new Date(Date.now() + 3 * 86400000).toISOString().slice(0,10);
}
