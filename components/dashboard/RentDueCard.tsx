"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface OverduePaymentItem {
  id: string;
  dueDate: string;
  amount: number;
  tenantName: string;
  propertyName: string;
  propertyHref: string;
}

interface RentDueCardProps {
  overdueCount: number;
  overdueAmount: number;
  upcomingCount: number;
  overduePayments: OverduePaymentItem[];
}

const bdt = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

function daysOverdue(dueDate: string) {
  const due = new Date(dueDate).getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((now - due) / (1000 * 60 * 60 * 24)));
}

export default function RentDueCard({
  overdueCount,
  overdueAmount,
  upcomingCount,
  overduePayments,
}: RentDueCardProps) {
  const t = useTranslations("RentDueCard");

  if (overdueCount === 0 && upcomingCount === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">{t("title")}</CardTitle>
        <Link href="/leases" className="text-xs text-muted-foreground underline">
          {t("viewAll")}
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{t("overdue")}</p>
            <p className="truncate text-lg font-semibold text-destructive">
              {overdueCount} · {bdt.format(overdueAmount)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{t("upcoming30Days")}</p>
            <p className="truncate text-lg font-semibold">{upcomingCount}</p>
          </div>
        </div>
        {overduePayments.length > 0 && (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-warning/50 bg-warning/10">
            {overduePayments.map((p) => (
              <li key={p.id} className="min-w-0 p-2 text-sm">
                <Link href={p.propertyHref} className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">
                    {p.tenantName} · {p.propertyName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {bdt.format(p.amount)} ·{" "}
                    {t("daysOverdue", { count: daysOverdue(p.dueDate) })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
