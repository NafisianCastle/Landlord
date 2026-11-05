"use client";

import { useTranslations } from "next-intl";
import { useLeaseSecrets, type LeaseSecretSource } from "@/lib/crypto/leaseSecrets";

/** The tenant's name, decrypted in the browser when the lease is encrypted. */
export function useTenantName(source: LeaseSecretSource) {
  const t = useTranslations("LeaseSecrets");
  const { secrets } = useLeaseSecrets(source);
  return secrets?.tenantName || t("encryptedTenant");
}

export default function TenantName({ lease }: { lease: LeaseSecretSource }) {
  return <>{useTenantName(lease)}</>;
}
