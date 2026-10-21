import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createLease, updateLease, ensureLeasePayments, type LeaseSubjectType } from "@/app/actions/leases";
import { Card, CardContent } from "@/components/ui/card";
import LeaseForm from "@/components/leases/LeaseForm";
import PaymentsList, { type PaymentRow } from "@/components/leases/PaymentsList";
import EndLeaseButton from "@/components/leases/EndLeaseButton";
import DeleteLeaseButton from "@/components/leases/DeleteLeaseButton";
import RenewLeaseButton from "@/components/leases/RenewLeaseButton";

import RentHistoryForm from "@/components/leases/RentHistoryForm";

const DAY_MS = 24 * 60 * 60 * 1000;

function endsWithinDays(endDate: string, days: number) {
  return new Date(endDate).getTime() - Date.now() <= days * DAY_MS;
}

export default async function LeaseSection({
  subjectType,
  subjectId,
}: {
  subjectType: LeaseSubjectType;
  subjectId: string;
}) {
  const t = await getTranslations("LeaseSection");
  const supabase = await createClient();
  const column = subjectType === "plot" ? "plot_id" : "apartment_id";

  const { data: lease } = await supabase
    .from("leases")
    .select("*")
    .eq(column, subjectId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lease) {
    return (
      <div>
        <h2 className="mb-2 font-medium">{t("title")}</h2>
        <Card>
          <CardContent className="pt-6">
            <LeaseForm
              action={createLease.bind(null, subjectType, subjectId)}
              submitLabel={t("addLease")}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  await ensureLeasePayments(lease.id);

  const { data: payments } = await supabase
    .from("lease_payments")
    .select("id, due_date, amount, paid, paid_date, paid_amount")
    .eq("lease_id", lease.id)
    .order("due_date", { ascending: true });

  const rows: PaymentRow[] = (payments ?? []).map((p) => ({
    id: p.id,
    dueDate: p.due_date,
    amount: p.amount,
    paid: p.paid,
    paidDate: p.paid_date,
    paidAmount: p.paid_amount,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="mb-2 font-medium">{t("title")}</h2>
        <Card>
          <CardContent className="pt-6">
            <LeaseForm
              action={updateLease.bind(null, lease.id, subjectType, subjectId)}
              initial={{
                tenantName: lease.tenant_name,
                tenantPhone: lease.tenant_phone,
                tenantEmail: lease.tenant_email,
                rentAmount: lease.rent_amount,
                frequency: lease.frequency,
                startDate: lease.start_date,
                endDate: lease.end_date,
                notes: lease.notes,
              }}
              submitLabel={t("saveChanges")}
            />
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="mb-2 font-medium">{t("payments")}</h3>
        {lease.frequency === "monthly" && (
          <RentHistoryForm leaseId={lease.id} subjectType={subjectType} subjectId={subjectId}
            startDate={lease.start_date} endDate={lease.end_date} payments={rows}
            currentMonth={new Date().toISOString().slice(0, 7)} />
        )}
        <PaymentsList payments={rows} subjectType={subjectType} subjectId={subjectId} />
      </div>

      <div className="flex flex-wrap gap-2">
        {lease.end_date && endsWithinDays(lease.end_date, 14) && (
          <RenewLeaseButton
            leaseId={lease.id}
            subjectType={subjectType}
            subjectId={subjectId}
            currentEndDate={lease.end_date}
          />
        )}
        <EndLeaseButton leaseId={lease.id} subjectType={subjectType} subjectId={subjectId} />
        <DeleteLeaseButton leaseId={lease.id} subjectType={subjectType} subjectId={subjectId} />
      </div>
    </div>
  );
}
