"use client";

import { useTranslations } from "next-intl";

export interface MonthlyPoint {
  month: string; // YYYY-MM-DD (first of month)
  income: number;
  expense: number;
}

const bdt = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  notation: "compact",
  maximumFractionDigits: 1,
});

export default function TrendChart({ points }: { points: MonthlyPoint[] }) {
  const t = useTranslations("TrendChart");
  const max = Math.max(1, ...points.map((p) => Math.max(p.income, p.expense)));
  const barWidth = 100 / points.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-success" aria-hidden="true" />
          {t("income")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-destructive" aria-hidden="true" />
          {t("expense")}
        </span>
      </div>

      <svg
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
        className="h-40 w-full"
        role="img"
        aria-label={t("chartLabel")}
      >
        <line x1="0" y1="49" x2="100" y2="49" stroke="currentColor" className="text-border" strokeWidth="0.3" />
        {points.map((p, i) => {
          const x = i * barWidth;
          const incomeH = (p.income / max) * 44;
          const expenseH = (p.expense / max) * 44;
          const groupWidth = barWidth * 0.6;
          const barW = groupWidth / 2 - 0.3;
          return (
            <g key={p.month}>
              <rect
                x={x + barWidth * 0.2}
                y={49 - incomeH}
                width={barW}
                height={incomeH}
                rx="0.6"
                className="fill-success"
              >
                <title>
                  {p.month.slice(0, 7)} · {t("income")}: {bdt.format(p.income)}
                </title>
              </rect>
              <rect
                x={x + barWidth * 0.2 + barW + 0.6}
                y={49 - expenseH}
                width={barW}
                height={expenseH}
                rx="0.6"
                className="fill-destructive"
              >
                <title>
                  {p.month.slice(0, 7)} · {t("expense")}: {bdt.format(p.expense)}
                </title>
              </rect>
            </g>
          );
        })}
      </svg>

      <div className="flex text-[10px] text-muted-foreground">
        {points.map((p, i) => (
          <span key={p.month} className="flex-1 truncate text-center" style={{ display: i % 2 === 0 || points.length <= 6 ? undefined : "none" }}>
            {new Date(p.month).toLocaleDateString(undefined, { month: "short" })}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>{t("chartLabel")}</caption>
        <thead>
          <tr>
            <th>{t("month")}</th>
            <th>{t("income")}</th>
            <th>{t("expense")}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.month}>
              <td>{p.month.slice(0, 7)}</td>
              <td>{bdt.format(p.income)}</td>
              <td>{bdt.format(p.expense)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
