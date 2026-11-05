"use client";

import { useId, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { recordRentHistory } from "@/app/actions/rentHistory";
import type { LeaseSubjectType } from "@/app/actions/leases";
import { expandRentRanges, type RentRange } from "@/lib/rent-history";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PaymentRow } from "./PaymentsList";

export default function RentHistoryForm({ leaseId, subjectType, subjectId, startDate, endDate, payments, currentMonth }: {
  leaseId: string; subjectType: LeaseSubjectType; subjectId: string;
  startDate: string; endDate: string | null; payments: PaymentRow[]; currentMonth: string;
}) {
  const t = useTranslations("RentHistory");
  const locale = useLocale();
  const id = useId();
  const maxMonth = endDate && endDate.slice(0, 7) < currentMonth ? endDate.slice(0, 7) : currentMonth;
  const [ranges, setRanges] = useState<(RentRange & { key: number })[]>([
    { key: 0, from: startDate.slice(0, 7), to: maxMonth, amount: "" },
  ]);
  const [nextKey, setNextKey] = useState(1);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const preview = expandRentRanges(ranges, startDate, endDate, `${currentMonth}-01`);
  const paidMonths = new Set(payments.filter(p => p.paid).map(p => p.dueDate.slice(0, 7)));
  const newMonths = preview.months?.filter(month => !paidMonths.has(month.month)) ?? [];
  const skipped = (preview.months?.length ?? 0) - newMonths.length;
  const total = newMonths.reduce((sum, month) => sum + Math.round(month.amount * 100), 0) / 100;
  const currency = new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 2 });

  function change(key: number, field: keyof RentRange, value: string) {
    setMessage({});
    setRanges(rows => rows.map(row => row.key === key ? { ...row, [field]: value } : row));
  }

  return (
    <details className="mb-3 rounded-lg border border-border bg-card p-4">
      <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-ring">{t("title")}</summary>
      <form className="mt-4 flex flex-col gap-4" onSubmit={event => {
        event.preventDefault();
        if (preview.error || pending) return;
        setMessage({});
        startTransition(async () => {
          try {
            const result = await recordRentHistory(leaseId, subjectType, subjectId,
              ranges.map(({ from, to, amount }) => ({ from, to, amount })));
            setMessage(result.error ? { error: result.error } : { success: t("saved", { recorded: result.recorded ?? 0, skipped: result.skipped ?? 0 }) });
          } catch { setMessage({ error: t("saveFailed") }); }
        });
      }}>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <p className="text-sm text-muted-foreground">{t("leaseHint", { start: startDate })}</p>
        <fieldset disabled={pending} className="flex min-w-0 flex-col gap-3">
          {ranges.map((range, index) => (
            <fieldset key={range.key} className="min-w-0 rounded-md border border-border p-3">
              <legend className="px-1 text-sm font-medium">{t("range", { number: index + 1 })}</legend>
              <div className="grid min-w-0 gap-3 sm:grid-cols-3">
                <label htmlFor={`${id}-${range.key}-from`} className="min-w-0 text-sm">{t("from")}
                  <Input id={`${id}-${range.key}-from`} type="month" required min={startDate.slice(0, 7)} max={maxMonth}
                    value={range.from} onChange={e => change(range.key, "from", e.target.value)} className="mt-1" />
                </label>
                <label htmlFor={`${id}-${range.key}-to`} className="min-w-0 text-sm">{t("to")}
                  <Input id={`${id}-${range.key}-to`} type="month" required min={startDate.slice(0, 7)} max={maxMonth}
                    value={range.to} onChange={e => change(range.key, "to", e.target.value)} className="mt-1" />
                </label>
                <label htmlFor={`${id}-${range.key}-amount`} className="min-w-0 text-sm">{t("amount")}
                  <Input id={`${id}-${range.key}-amount`} type="number" required min="0.01" max="1000000000000" step="0.01" inputMode="decimal"
                    value={range.amount} onChange={e => change(range.key, "amount", e.target.value)} className="mt-1" />
                </label>
              </div>
              {ranges.length > 1 && <Button type="button" variant="ghost" size="sm" className="mt-2" aria-label={t("removeRange", { number: index + 1 })}
                onClick={() => { setRanges(rows => rows.filter(row => row.key !== range.key)); setMessage({}); }}>{t("remove")}</Button>}
            </fieldset>
          ))}
          <Button type="button" variant="outline" className="self-start" disabled={ranges.length >= 50} onClick={() => {
            setRanges(rows => [...rows, { key: nextKey, from: "", to: "", amount: "" }]);
            setNextKey(value => value + 1); setMessage({});
          }}>{t("addRange")}</Button>
        </fieldset>
        {preview.error ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">{t(preview.error)}</p>
        ) : (
          <div className="rounded-md bg-secondary p-3 text-sm" aria-live="polite">
            <p>{t("preview", { count: newMonths.length, total: currency.format(total) })}</p>
            <p className="mt-1 text-muted-foreground">{t("skipPreview", { count: skipped })}</p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t("dateHint")}</p>
        <Button type="submit" className="h-auto min-h-9 self-start whitespace-normal" disabled={pending || !!preview.error || !newMonths.length}>
          {pending ? t("saving") : t("save")}
        </Button>
        {message.error && <p role="alert" className="text-sm text-destructive">{message.error}</p>}
        {message.success && <p role="status" className="text-sm text-success">{message.success}</p>}
      </form>
    </details>
  );
}
