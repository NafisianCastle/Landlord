"use client";

import { useEffect, useState } from "react";
import { decryptJSON, fromPgBytea } from "@/lib/crypto/encryption";
import { getSessionDEK, onSessionChange } from "@/lib/crypto/session";

/**
 * Tenant details a lease can store encrypted (see migration
 * 20261105130000_lease_tenant_encryption.sql). Same keys on web and mobile.
 */
export interface LeaseSecrets {
  tenantName: string | null;
  tenantPhone: string | null;
  tenantEmail: string | null;
  notes: string | null;
}

/** The lease columns needed to show its tenant details, encrypted or not. */
export interface LeaseSecretSource {
  tenant_name?: string | null;
  tenant_phone?: string | null;
  tenant_email?: string | null;
  notes?: string | null;
  sensitive_encrypted?: string | null;
  sensitive_iv?: string | null;
}

export const LEASE_SECRET_COLUMNS = "tenant_name, tenant_phone, tenant_email, notes, sensitive_encrypted, sensitive_iv";

// Many rows on a page can share a session; decrypt each blob once.
const cache = new Map<string, Promise<LeaseSecrets>>();

export function decryptLeaseSecrets(source: LeaseSecretSource, dek: CryptoKey): Promise<LeaseSecrets> {
  const hex = source.sensitive_encrypted!;
  let pending = cache.get(hex);
  if (!pending) {
    pending = decryptJSON<LeaseSecrets>(fromPgBytea(hex), fromPgBytea(source.sensitive_iv!), dek);
    pending.catch(() => cache.delete(hex));
    cache.set(hex, pending);
  }
  return pending;
}

function plaintext(source: LeaseSecretSource): LeaseSecrets {
  return {
    tenantName: source.tenant_name ?? null,
    tenantPhone: source.tenant_phone ?? null,
    tenantEmail: source.tenant_email ?? null,
    notes: source.notes ?? null,
  };
}

/**
 * The lease's tenant details: plaintext rows immediately, encrypted rows once
 * the session is unlocked. `secrets` is null while locked (or undecryptable).
 */
export function useLeaseSecrets(source: LeaseSecretSource) {
  const hex = source.sensitive_encrypted && source.sensitive_iv ? source.sensitive_encrypted : null;
  const [unlocked, setUnlocked] = useState(() => getSessionDEK() !== null);
  const [decrypted, setDecrypted] = useState<{ hex: string; value: LeaseSecrets | null } | null>(null);

  useEffect(() => onSessionChange(() => setUnlocked(getSessionDEK() !== null)), []);

  useEffect(() => {
    const dek = getSessionDEK();
    if (!hex || !dek) return;
    let cancelled = false;
    decryptLeaseSecrets(source, dek).then(
      (value) => !cancelled && setDecrypted({ hex, value }),
      () => !cancelled && setDecrypted({ hex, value: null }),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex, unlocked]);

  if (!hex) return { encrypted: false, secrets: plaintext(source) };
  const ready = unlocked && decrypted?.hex === hex;
  return { encrypted: true, secrets: ready ? decrypted.value : null };
}
