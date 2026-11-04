import { getFormatter, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createLease, updateLease, ensureLeasePayments, type LeaseSubjectType } from "@/app/actions/leases";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LeaseForm from "@/components/leases/LeaseForm";
import PaymentsList, { type PaymentRow } from "@/components/leases/PaymentsList";
import EndLeaseButton from "@/components/leases/EndLeaseButton";
import DeleteLeaseButton from "@/components/leases/DeleteLeaseButton";
import RenewLeaseButton from "@/components/leases/RenewLeaseButton";
import RentHistoryForm from "@/components/leases/RentHistoryForm";
import BillCard from "@/components/bills/BillCard";
import { billStatus, type ApartmentBill, type BillProof } from "@/lib/bills";

const DAY_MS = 24 * 60 * 60 * 1000;

type LeaseRow = {
  id: string;
  tenant_name: string;
  tenant_phone: string | null;
  tenant_email: string | null;
  rent_amount: number;
  frequency: string;
  start_date: string;
  end_date: string | null;
  status: "active" | "ended";
  notes: string | null;
};

function endsWithinDays(endDate: string, days: number) {
  return new Date(endDate).getTime() - Date.now() <= days * DAY_MS;
}

function billsForLease(lease: LeaseRow, bills: ApartmentBill[]) {
  const email = lease.tenant_email?.trim().toLowerCase();
  if (!email) return [];
  return bills.filter((bill) =>
    bill.tenant_email.trim().toLowerCase() === email &&
    bill.due_date >= lease.start_date &&
    (!lease.end_date || bill.due_date <= lease.end_date));
}

function SummaryCard({ label, value, detail, warning = false }: {
  label: string;
  value: string;
  detail?: string;
  warning?: boolean;
}) {
  return <div className={warning
    ? "rounded-xl border border-destructive/30 bg-destructive/10 p-4"
    : "rounded-xl border border-border p-4"}>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="mt-1 text-xl font-semibold">{value}</p>
    {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
  </div>;
}

export default async function LeaseSection({
  subjectType,
  subjectId,
}: {
  subjectType: LeaseSubjectType;
  subjectId: string;
}) {
  const [t, format] = await Promise.all([
    getTranslations("LeaseSection"),
    getFormatter(),
  ]);
  const supabase = await createClient();
  const column = subjectType === "plot" ? "plot_id" : "apartment_id";

  const leaseResult = await supabase
    .from("leases")
    .select("id, tenant_name, tenant_phone, tenant_email, rent_amount, frequency, start_date, end_date, status, notes")
    .eq(column, subjectId)
    .order("start_date", { ascending: false });

  if (leaseResult.error) {
    return <p role="alert" className="text-sm text-destructive">{t("loadFailed")}</p>;
  }

  const leases = (leaseResult.data ?? []) as LeaseRow[];
  const activeLease = leases.find((lease) => lease.status === "active") ?? null;
  if (activeLease) await ensureLeasePayments(activeLease.id);

  const paymentResult = leases.length
    ? await supabase
        .from("lease_payments")
        .select("id, lease_id, due_date, amount, paid, paid_date, paid_amount, notes")
        .in("lease_id", leases.map((lease) => lease.id))
        .order("due_date", { ascending: true })
    : { data: [], error: null };

  const billResult = subjectType === "apartment"
    ? await supabase
        .from("apartment_bills")
        .select("id, apartment_id, owner_id, tenant_share_id, tenant_email, title, amount, due_date, visible_to_tenant, file_name, paid_at")
        .eq("apartment_id", subjectId)
        .not("file_name", "is", null)
        .order("due_date", { ascending: false })
    : { data: [], error: null };

  if (paymentResult.error || billResult.error) {
    return <p role="alert" className="text-sm text-destructive">{t("loadFailed")}</p>;
  }

  const bills = (billResult.data ?? []) as ApartmentBill[];
  const proofResult = bills.length
    ? await supabase
        .from("apartment_bill_proofs")
        .select("id, bill_id, file_name, status, review_note, created_at")
        .in("bill_id", bills.map((bill) => bill.id))
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (proofResult.error) {
    return <p role="alert" className="text-sm text-destructive">{t("loadFailed")}</p>;
  }

  const proofs = (proofResult.data ?? []) as BillProof[];
  const paymentsByLease = new Map<string, PaymentRow[]>();
  for (const payment of paymentResult.data ?? []) {
    const rows = paymentsByLease.get(payment.lease_id) ?? [];
    rows.push({
      id: payment.id,
      dueDate: payment.due_date,
      amount: payment.amount,
      paid: payment.paid,
      paidDate: payment.paid_date,
      paidAmount: payment.paid_amount,
      notes: payment.notes,
    });
    paymentsByLease.set(payment.lease_id, rows);
  }

  const money = (value: number) => format.number(value, {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  });

  return <div className="flex flex-col gap-6">
    <section>
      <h2 className="mb-2 font-medium">{t("title")}</h2>
      <Card>
        <CardContent className="pt-6">
          {activeLease ? <LeaseForm
            action={updateLease.bind(null, activeLease.id, subjectType, subjectId)}
            subjectType={subjectType}
            initial={{
              tenantName: activeLease.tenant_name,
              tenantPhone: activeLease.tenant_phone,
              tenantEmail: activeLease.tenant_email,
              rentAmount: activeLease.rent_amount,
              frequency: activeLease.frequency,
              startDate: activeLease.start_date,
              endDate: activeLease.end_date,
              notes: activeLease.notes,
            }}
            submitLabel={t("saveChanges")}
          /> : <LeaseForm
            action={createLease.bind(null, subjectType, subjectId)}
            subjectType={subjectType}
            submitLabel={t("addLease")}
          />}
        </CardContent>
      </Card>
    </section>

    <section aria-labelledby={`tenant-history-${subjectId}`}>
      <div className="mb-3">
        <h2 id={`tenant-history-${subjectId}`} className="font-medium">{t("tenantHistory")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("historyHint")}</p>
      </div>
      <div className="flex flex-col gap-3">
        {leases.map((lease) => {
          const payments = paymentsByLease.get(lease.id) ?? [];
          const tenantBills = billsForLease(lease, bills);
          const proofsFor = (billId: string) => proofs.filter((proof) => proof.bill_id === billId);
          const unpaidBills = tenantBills.filter((bill) => billStatus(bill, proofsFor(bill.id)) !== "paid");
          const scheduledRent = payments.reduce((total, payment) => total + Number(payment.amount), 0);
          const paidRent = payments.filter((payment) => payment.paid)
            .reduce((total, payment) => total + Number(payment.paidAmount ?? payment.amount), 0);
          const outstandingRent = payments.filter((payment) => !payment.paid)
            .reduce((total, payment) => total + Number(payment.amount), 0);
          const unpaidBillTotal = unpaidBills.reduce((total, bill) => total + Number(bill.amount), 0);
          const hasFinancialHistory = payments.some((payment) => payment.paid) || tenantBills.length > 0;
          const isActive = lease.id === activeLease?.id;

          return <details key={lease.id} open={isActive} className="rounded-xl border border-border bg-card">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-4">
              <span className="font-medium">{lease.tenant_name}</span>
              <span className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{lease.start_date} – {lease.end_date ?? t("ongoing")}</span>
                <Badge variant={isActive ? "secondary" : "outline"}>{t(isActive ? "active" : "ended")}</Badge>
              </span>
            </summary>
            <div className="flex flex-col gap-5 border-t border-border p-4">
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                {lease.tenant_phone && <div><dt className="text-muted-foreground">{t("phone")}</dt><dd>{lease.tenant_phone}</dd></div>}
                {lease.tenant_email && <div><dt className="text-muted-foreground">{t("email")}</dt><dd className="break-all">{lease.tenant_email}</dd></div>}
                <div><dt className="text-muted-foreground">{t("rent")}</dt><dd>{money(Number(lease.rent_amount))} · {t(`frequency.${lease.frequency}`)}</dd></div>
                {lease.notes && <div><dt className="text-muted-foreground">{t("notes")}</dt><dd className="whitespace-pre-wrap break-words">{lease.notes}</dd></div>}
              </dl>

              <div>
                <h3 className="mb-2 text-sm font-medium">{t("financialSummary")}</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard label={t("scheduledRent")} value={money(scheduledRent)} />
                  <SummaryCard label={t("rentPaid")} value={money(paidRent)} />
                  <SummaryCard label={t("outstandingRent")} value={money(outstandingRent)} warning={outstandingRent > 0} />
                  <SummaryCard label={t("unpaidBills")} value={money(unpaidBillTotal)} detail={t("billCount", { count: unpaidBills.length })} warning={unpaidBills.length > 0} />
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">{t("transactions")}</h3>
                {isActive && lease.frequency === "monthly" && <RentHistoryForm
                  leaseId={lease.id}
                  subjectType={subjectType}
                  subjectId={subjectId}
                  startDate={lease.start_date}
                  endDate={lease.end_date}
                  payments={payments}
                  currentMonth={new Date().toISOString().slice(0, 7)}
                />}
                <PaymentsList payments={payments} subjectType={subjectType} subjectId={subjectId} />
              </div>

              {subjectType === "apartment" && <div className="flex flex-col gap-3">
                <h3 className="text-sm font-medium">{t("bills")}</h3>
                {tenantBills.map((bill) => <BillCard
                  key={bill.id}
                  bill={bill}
                  proofs={proofsFor(bill.id)}
                  isOwner
                />)}
                {!tenantBills.length && <p className="text-sm text-muted-foreground">{t("noBills")}</p>}
              </div>}

              <div className="flex flex-wrap gap-2">
                {isActive && lease.end_date && endsWithinDays(lease.end_date, 14) && <RenewLeaseButton
                  leaseId={lease.id}
                  subjectType={subjectType}
                  subjectId={subjectId}
                  currentEndDate={lease.end_date}
                />}
                {isActive && <EndLeaseButton leaseId={lease.id} subjectType={subjectType} subjectId={subjectId} />}
                {!hasFinancialHistory && <DeleteLeaseButton leaseId={lease.id} subjectType={subjectType} subjectId={subjectId} />}
              </div>
            </div>
          </details>;
        })}
        {!leases.length && <p className="text-sm text-muted-foreground">{t("noHistory")}</p>}
      </div>
    </section>
  </div>;
}
