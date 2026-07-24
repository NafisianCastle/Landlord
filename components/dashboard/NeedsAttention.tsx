"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

interface UnwalkedPlot {
  id: string;
  name: string;
}

export default function NeedsAttention({ plots }: { plots: UnwalkedPlot[] }) {
  const t = useTranslations("NeedsAttention");

  if (plots.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
      <p className="mb-2 text-sm font-medium">{t("missingBoundary", { count: plots.length })}</p>
      <ul className="flex flex-col gap-1">
        {plots.map((plot) => (
          <li key={plot.id}>
            <Link href={`/plots/${plot.id}`} className="text-sm underline underline-offset-2">
              {plot.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
