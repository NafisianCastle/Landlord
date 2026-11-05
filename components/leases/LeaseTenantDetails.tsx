"use client";

import { useTranslations } from "next-intl";
import { useLeaseSecrets, type LeaseSecretSource } from "@/lib/crypto/leaseSecrets";

/** Phone, email and notes rows of a lease's details list, decrypted when needed. */
export default function LeaseTenantDetails({ lease }: { lease: LeaseSecretSource }) {
  const t = useTranslations("LeaseSection");
  const tSecrets = useTranslations("LeaseSecrets");
  const { encrypted, secrets } = useLeaseSecrets(lease);

  if (encrypted && !secrets) {
    return <div className="sm:col-span-2 text-muted-foreground">{tSecrets("lockedDetails")}</div>;
  }
  return <>
    {secrets?.tenantPhone && <div><dt className="text-muted-foreground">{t("phone")}</dt><dd>{secrets.tenantPhone}</dd></div>}
    {secrets?.tenantEmail && <div><dt className="text-muted-foreground">{t("email")}</dt><dd className="break-all">{secrets.tenantEmail}</dd></div>}
    {secrets?.notes && <div><dt className="text-muted-foreground">{t("notes")}</dt><dd className="whitespace-pre-wrap break-words">{secrets.notes}</dd></div>}
  </>;
}
