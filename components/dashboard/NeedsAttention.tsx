"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTenantName } from "@/components/leases/TenantName";
import type { LeaseSecretSource } from "@/lib/crypto/leaseSecrets";

interface UnwalkedPlot {
  id: string;
  name: string;
}

interface ExpiringLease {
  id: string;
  tenant: LeaseSecretSource;
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
              <ExpiringLeaseItem key={lease.id} lease={lease} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ExpiringLeaseItem({ lease }: { lease: ExpiringLease }) {
  const t = useTranslations("NeedsAttention");
  const tenant = useTenantName(lease.tenant);
  return (
    <li>
      <Link href={lease.propertyHref} className="text-sm underline underline-offset-2">
        {t("leaseExpiringItem", { tenant, date: lease.endDate })}
      </Link>
    </li>
  );
}
