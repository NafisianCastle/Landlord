"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

interface UnwalkedPlot {
  id: string;
  name: string;
}

interface ExpiringLease {
  id: string;
  tenantName: string;
  endDate: string;
  propertyHref: string;
}

export default function NeedsAttention({
  plots,
  expiringLeases = [],
}: {
  plots: UnwalkedPlot[];
  expiringLeases?: ExpiringLease[];
}) {
  const t = useTranslations("NeedsAttention");

  if (plots.length === 0 && expiringLeases.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {plots.length > 0 && (
        <div className="rounded-lg border border-warning/50 bg-warning/10 p-3">
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
      )}
      {expiringLeases.length > 0 && (
        <div className="rounded-lg border border-warning/50 bg-warning/10 p-3">
          <p className="mb-2 text-sm font-medium">
            {t("leasesExpiring", { count: expiringLeases.length })}
          </p>
          <ul className="flex flex-col gap-1">
            {expiringLeases.map((lease) => (
              <li key={lease.id}>
                <Link href={lease.propertyHref} className="text-sm underline underline-offset-2">
                  {t("leaseExpiringItem", { tenant: lease.tenantName, date: lease.endDate })}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
