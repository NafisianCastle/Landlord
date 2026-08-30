"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteExpense, type ExpenseSubjectType, type ExpenseCategory } from "@/app/actions/expenses";
import { Button } from "@/components/ui/button";

export interface ExpenseRow {
  id: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  notes: string | null;
}

const bdt = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

export default function ExpensesList({
  expenses,
  subjectType,
  subjectId,
}: {
  expenses: ExpenseRow[];
  subjectType: ExpenseSubjectType;
  subjectId: string;
}) {
  const t = useTranslations("ExpensesList");
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function remove(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await deleteExpense(id, subjectType, subjectId);
      if (result?.error) setError(result.error);
    });
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {expenses.map((row) => (
          <li key={row.id} className="flex items-start justify-between gap-2 p-3 text-sm">
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{t(`categoryOption.${row.category}`)}</span>
              {row.notes && <span className="text-xs text-muted-foreground">{row.notes}</span>}
              <span className="text-xs text-muted-foreground">
                {row.expenseDate} · {bdt.format(row.amount)}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending && pendingId === row.id}
              onClick={() => remove(row.id)}
            >
              {t("delete")}
            </Button>
          </li>
        ))}
        {expenses.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">{t("noExpensesYet")}</li>
        )}
      </ul>
      {expenses.length > 0 && (
        <p className="text-right text-sm text-muted-foreground">{t("total", { amount: bdt.format(total) })}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
