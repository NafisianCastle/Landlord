"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { recordPayment, unmarkPayment, type LeaseSubjectType } from "@/app/actions/leases";
import { Button } from "@/components/ui/button";

export interface PaymentRow {
  id: string;
  dueDate: string;
  amount: number;
  paid: boolean;
  paidDate: string | null;
  paidAmount: number | null;
}

const bdt = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

function isOverdue(row: PaymentRow) {
  return !row.paid && row.dueDate < new Date().toISOString().slice(0, 10);
}

export default function PaymentsList({
  payments,
  subjectType,
  subjectId,
}: {
  payments: PaymentRow[];
  subjectType: LeaseSubjectType;
  subjectId: string;
}) {
  const t = useTranslations("PaymentsList");
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function markPaid(paymentId: string) {
    setError(null);
    setPendingId(paymentId);
    startTransition(async () => {
      const result = await recordPayment(
        paymentId,
        subjectType,
        subjectId,
        undefined,
        new FormData(),
      );
      if (result?.error) setError(result.error);
    });
  }

  function undo(paymentId: string) {
    setError(null);
    setPendingId(paymentId);
    startTransition(async () => {
      const result = await unmarkPayment(paymentId, subjectType, subjectId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {payments.map((row) => (
          <li
            key={row.id}
            className={
              isOverdue(row)
                ? "flex items-center justify-between gap-2 bg-warning/10 p-3 text-sm"
                : "flex items-center justify-between gap-2 p-3 text-sm"
            }
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{row.dueDate}</span>
              <span className="truncate text-xs text-muted-foreground">
                {row.paid
                  ? (row.paidDate ? t("receivedOn", { date: row.paidDate }) : t("paidDateUnknown"))
                  : isOverdue(row)
                    ? t("overdue")
                    : t("upcoming")}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="truncate">{bdt.format(row.paidAmount ?? row.amount)}</span>
              {row.paid ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending && pendingId === row.id}
                  onClick={() => undo(row.id)}
                >
                  {pending && pendingId === row.id ? t("updating") : t("undo")}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={pending && pendingId === row.id}
                  onClick={() => markPaid(row.id)}
                >
                  {pending && pendingId === row.id ? t("updating") : t("markPaid")}
                </Button>
              )}
            </div>
          </li>
        ))}
        {payments.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">{t("noPaymentsYet")}</li>
        )}
      </ul>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
