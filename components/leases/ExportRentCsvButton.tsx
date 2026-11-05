"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { getSessionDEK } from "@/lib/crypto/session";
import { decryptLeaseSecrets, LEASE_SECRET_COLUMNS, type LeaseSecretSource } from "@/lib/crypto/leaseSecrets";
import { Button } from "@/components/ui/button";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

type LeaseRef = LeaseSecretSource & {
  land_plots: { name: string } | null;
  apartments: { name: string } | null;
};

/**
 * Rent payment history as CSV. Built in the browser (not on the server) so
 * encrypted tenant names can be decrypted with the session key.
 */
export default function ExportRentCsvButton({ label }: { label: string }) {
  const tSecrets = useTranslations("LeaseSecrets");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function exportCsv() {
    setBusy(true);
    setError(undefined);
    try {
      const { data, error: dbError } = await createClient()
        .from("lease_payments")
        .select(`due_date, amount, paid, paid_date, paid_amount, notes, leases!inner(${LEASE_SECRET_COLUMNS}, land_plots(name), apartments(name))`)
        .order("due_date", { ascending: true });
      if (dbError) throw new Error(dbError.message);

      const dek = getSessionDEK();
      const tenantName = async (lease: LeaseRef | null) => {
        if (!lease?.sensitive_encrypted) return lease?.tenant_name ?? "";
        if (!dek) return tSecrets("encryptedTenant");
        return (await decryptLeaseSecrets(lease, dek).catch(() => null))?.tenantName ?? tSecrets("encryptedTenant");
      };

      const lines = [["Tenant", "Property", "Due date", "Amount", "Paid", "Paid date", "Paid amount", "Notes"].join(",")];
      for (const p of data ?? []) {
        const lease = (Array.isArray(p.leases) ? p.leases[0] : p.leases) as unknown as LeaseRef | null;
        lines.push([
          csvEscape(await tenantName(lease)),
          csvEscape(lease?.land_plots?.name ?? lease?.apartments?.name ?? ""),
          p.due_date,
          String(p.amount),
          p.paid ? "yes" : "no",
          p.paid_date ?? "",
          p.paid_amount != null ? String(p.paid_amount) : "",
          csvEscape(p.notes ?? ""),
        ].join(","));
      }

      const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `rent-payments-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={exportCsv}>{label}</Button>
    {error && <p className="text-sm text-destructive">{error}</p>}
  </>;
}
