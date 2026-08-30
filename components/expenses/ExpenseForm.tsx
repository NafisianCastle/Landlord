"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ExpenseFormProps {
  action: (prevState: unknown, formData: FormData) => Promise<{ error?: string } | undefined>;
}

const CATEGORIES = ["tax", "insurance", "utility", "repair", "management_fee", "other"] as const;

export default function ExpenseForm({ action }: ExpenseFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const t = useTranslations("ExpenseForm");

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">{t("category")}</Label>
          <select
            id="category"
            name="category"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            defaultValue="other"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`categoryOption.${c}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">{t("amount")}</Label>
          <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="expenseDate">{t("expenseDate")}</Label>
          <Input
            id="expenseDate"
            name="expenseDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-fit" disabled={pending}>
        {pending ? t("saving") : t("addExpense")}
      </Button>
    </form>
  );
}
